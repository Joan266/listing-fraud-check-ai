import json
import uuid
from fastapi import HTTPException
from app.db.models import Chat, ChatMessage, FraudCheck, JobStatus
from app.db.session import SessionLocal
from app.schemas import ExtractedListingData
from app.services import gemini_analysis
from app.utils.helpers import load_prompt
from app.workers.queues import analysis_fast_queue
from app.workers.tasks import job_geocode_places

def process_data_extraction(session_id: str, chat_id: uuid.UUID | None, user_message: dict) -> dict:
    """
    Handles the Phase 1 logic of extracting and correcting data from the chat.
    """
    db = SessionLocal()
    try:
        if chat_id:
            chat = db.query(Chat).filter(Chat.id == chat_id, Chat.session_id == session_id).first()
            if not chat:
                raise HTTPException(status_code=404, detail="Chat session not found or access denied.")
        else:
            chat = Chat(session_id=session_id)
            db.add(chat)
            db.commit()
            db.refresh(chat)


        db.add(ChatMessage(chat_id=chat.id, role="user", content=user_message['content']))
        
        # FIX 1: Increment the message count
        chat.message_count += 1
        db.commit()

        ai_response_text = ""
        extracted_data = {}
        geocode_job_id = None

        if chat.status == JobStatus.COMPLETED:
            ai_response_text = "The post-analysis Q&A is not yet implemented."
        else:
            if chat.message_count >= 5:
                ai_response_text = "Please review the form on the right and click 'Start Analysis' when ready."
            else:
                history = db.query(ChatMessage).filter(ChatMessage.chat_id == chat.id).order_by(ChatMessage.created_at).all()
                chat_history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
                current_data_json = json.dumps(chat.extracted_data or {}, indent=2)

                context = f"[CURRENT EXTRACTED DATA]\n{current_data_json}\n\n[FULL CHAT HISTORY]\n{chat_history_text}"
                updated_data_json = gemini_analysis.extract_data_from_text(context)

                chat.extracted_data = updated_data_json
                db.commit()
                
                extracted_data = ExtractedListingData.model_validate(updated_data_json)
                
                if extracted_data.address:
                    geocode_job = analysis_fast_queue.enqueue(job_geocode_places, extracted_data.address)
                    geocode_job_id = geocode_job.id
                    ai_response_text = "Thanks! I've updated the information. Please check the form and map on the right."
                else:
                    ai_response_text = "I still need an address to get started. Could you please provide it?"

        ai_message = ChatMessage(chat_id=chat.id, role="assistant", content=ai_response_text)
        db.add(ai_message)
        db.commit()

        return {
            "chat_id": str(chat.id), 
            "response": {"role": "assistant", "content": ai_response_text},
            "extracted_data": extracted_data.model_dump(),
            "geocode_job_id": geocode_job_id
        }
        
    finally:
        db.close()
        
def process_q_and_a(session_id: str, chat_id: uuid.UUID, user_message: dict) -> dict:
    """
    Handles the Phase 2 logic of answering questions.
    """
    db = SessionLocal()
    try:
        # Find the chat, ensuring it belongs to the correct session
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.session_id == session_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat session not found or access denied.")
        if chat.message_count >= 10: # Example limit of 10 total messages
            ai_response_text = "You've reached the message limit for this analysis. To check another listing, please start a new session."
            return {"chat_id": str(chat.id), "response": {"role": "assistant", "content": ai_response_text}}

        fraud_check = db.query(FraudCheck).filter(FraudCheck.id == chat.fraud_check_id).first()
        final_report = fraud_check.final_report

        # 2. Save the user's new question
        db.add(ChatMessage(chat_id=chat.id, role="user", content=user_message['content']))
        db.commit()

        history = db.query(ChatMessage).filter(ChatMessage.chat_id == chat.id).order_by(ChatMessage.created_at).all()
        chat_history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
     
        prompt = load_prompt("post_analysis_chat_prompt")
        context = f"[FINAL REPORT]\n{json.dumps(final_report)}\n\n[CHAT HISTORY]\n{chat_history_text}"
  
        full_context = {
            "FINAL REPORT": final_report,
            "CHAT HISTORY": chat_history_text
        }
  
        ai_response_json = gemini_analysis.process_q_and_a(full_context)
        ai_response_text = ai_response_json.get("response_text", "I'm sorry, I had trouble processing that.")

        # 4. Save and return the AI's response
        db.add(ChatMessage(chat_id=chat.id, role="assistant", content=ai_response_text))
        db.commit()

        return {"chat_id": str(chat.id), "response": {"role": "assistant", "content": ai_response_text}}
    finally:
        db.close()