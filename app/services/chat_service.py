import json
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.db.models import Chat, ChatMessage, FraudCheck, JobStatus
from app.db.session import SessionLocal
from app.schemas import ExtractedListingData
from app.services import gemini_analysis
from app.utils.helpers import load_prompt

def process_data_extraction(session_id: str, chat_id: uuid.UUID | None, user_message: dict) -> dict:
    """
    Handles the Phase 1 logic of extracting structured data from the user's raw text paste.
    This function is now streamlined for a single, non-conversational submission.
    """
    # Use a single database session for the entire operation
    db = SessionLocal()
    try:
        # A new chat is always created for the initial data extraction
        chat = Chat(session_id=session_id, status=JobStatus.PENDING)
        db.add(chat)
        db.commit()
        db.refresh(chat)

        # Save the user's raw text as the first message
        db.add(ChatMessage(chat_id=chat.id, role="user", content=user_message['content']))
        db.commit()

        # Call Gemini to extract structured data from the raw text
        # The context is simple: just the user's pasted text.
        extracted_data_json = gemini_analysis.extract_data_from_text(user_message['content'])

        if "error" in extracted_data_json:
            raise HTTPException(status_code=500, detail=f"AI data extraction failed: {extracted_data_json['error']}")

        # Store the extracted data within the chat record itself
        chat.extracted_data = extracted_data_json
        db.commit()
        
        # Validate and structure the data using the Pydantic schema
        extracted_data_schema = ExtractedListingData.model_validate(extracted_data_json)

        return {
            "chat_id": str(chat.id), 
            "extracted_data": extracted_data_schema.model_dump(),
        }
        
    finally:
        # Ensure the database session is always closed
        db.close()
        
def process_q_and_a(session_id: str, chat_id: uuid.UUID, user_message: dict, db: Session) -> dict:
    """
    Handles the Phase 2 logic of answering follow-up questions after an analysis is complete.
    """
    # Find the chat, ensuring it belongs to the correct session for security
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.session_id == session_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found or access denied.")
    
    # Prevent abuse by limiting the number of follow-up questions
    if chat.message_count >= 15:
        ai_response_text = "You've reached the message limit for this analysis. To check another listing, please start a new session."
        return {
            "chat_id": str(chat.id), 
            "response": {"role": "assistant", "content": ai_response_text}
        }

    # Find the completed fraud check report associated with this chat
    fraud_check = db.query(FraudCheck).filter(FraudCheck.id == chat.fraud_check_id).first()
    if not fraud_check or not fraud_check.final_report:
        raise HTTPException(status_code=404, detail="Analysis report not found for this chat.")
        
    # Save the user's new question to the database
    db.add(ChatMessage(chat_id=chat.id, role="user", content=user_message['content']))
    chat.message_count += 1 # Increment message count
    db.commit()

    # Retrieve the full conversation history to provide context to the AI
    history = db.query(ChatMessage).filter(ChatMessage.chat_id == chat.id).order_by(ChatMessage.created_at).all()
    chat_history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
 
    # Prepare the context for the Gemini model
    full_context = {
        "FINAL REPORT": fraud_check.final_report,
        "CHAT HISTORY": chat_history_text
    }
  
    # Call the AI to get a reasoned answer based on the report and chat history
    ai_response_json = gemini_analysis.process_q_and_a(full_context)
    ai_response_text = ai_response_json.get("response_text", "I'm sorry, I had trouble processing that request.")

    # Save the AI's response to the database
    db.add(ChatMessage(chat_id=chat.id, role="assistant", content=ai_response_text))
    db.commit()

    return {
        "chat_id": str(chat.id), 
        "response": {"role": "assistant", "content": ai_response_text}
    }
