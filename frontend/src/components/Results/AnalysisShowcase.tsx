import React, { useState } from 'react';
import { AnalysisRunbook } from './AnalysisRubook';
import { Sun, Moon, Shield } from 'lucide-react';

// Mock data based on your provided structure
const mockAnalysisSteps = [
    {
        job_name: "url_forensics",
        description: "Performs domain age, blacklist, and archive checks on the listing URL.",
        status: "COMPLETED",
        inputs_used: {
            listing_url: 'https://www.airbnb.com/rooms/1095008099179477611?adults=1&category_tag=Tag%3A8225&children=0&enable_m3_private_room=true&infants=0&pets=0&photo_id=1782891019&search_mode=flex_destinations_search&check_in=2024-04-22&check_out=2024-04-29&source_impression_id=p3_1712920010_P3qJVDFBD%2BbQOYSZ&previous_page_section_name=1000&federated_search_id=16067a5f-a45d-4d88-930e-e2f9f3524e56'
        },
        result: {
            domain_age: { years: 16, status: "legitimate" },
            blacklist_check: { listed: false, clean: true },
            archive_check: { found: true, consistent: true }
        }
    },
    {
        job_name: "description_plagiarism_check",
        description: "Performs an exact-match web search to see if the listing description has been copied from other sites.",
        status: "COMPLETED",
        inputs_used: {
            description: "Beautiful apartment in the heart of downtown with amazing city views..."
        },
        result: {
            plagiarism_detected: false,
            confidence_score: 0.95,
            sources_checked: 1247
        }
    },
    {
        job_name: "description_analysis",
        description: "Analyzes the listing description for red flags like pressure tactics or vague details.",
        status: "COMPLETED",
        inputs_used: {
            description: "Beautiful apartment in the heart of downtown with amazing city views..."
        },
        result: {
            red_flags: [],
            sentiment_score: 0.8,
            clarity_score: 0.9
        }
    },
    {
        job_name: "communication_analysis",
        description: "Analyzes communication text for fraudulent themes like risky payment requests.",
        status: "SKIPPED",
        inputs_used: {},
        result: {
            reason: "No communication data provided"
        }
    },
    {
        job_name: "listing_reviews_analysis",
        description: "Analyzes user-provided reviews for sentiment and potential red flags.",
        status: "COMPLETED",
        inputs_used: {
            reviews_count: 47,
            average_rating: 4.8
        },
        result: {
            sentiment_analysis: "positive",
            fake_review_probability: 0.12,
            review_consistency: "high"
        }
    },
    {
        job_name: "price_sanity_check",
        description: "Analyzes the listing price in the context of its location and description to detect if it's suspiciously high or low.",
        status: "COMPLETED",
        inputs_used: {
            price_per_night: 120,
            location: "Downtown Manhattan",
            property_type: "Apartment"
        },
        result: {
            price_category: "reasonable",
            market_comparison: 0.95,
            suspicion_level: "low"
        }
    },
    {
        job_name: "place_details",
        description: "Fetches rich details (ratings, reviews, etc.) for a verified location from the Google Places API.",
        status: "COMPLETED",
        inputs_used: {
            address: "123 Main St, New York, NY 10001"
        },
        result: {
            place_verified: true,
            google_rating: 4.2,
            total_reviews: 1834
        }
    },
    {
        job_name: "neighborhood_analysis",
        description: "Searches for nearby points of interest (supermarkets, parks, etc.) to analyze the area's character.",
        status: "COMPLETED",
        inputs_used: {
            coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        result: {
            safety_score: 0.85,
            amenities_count: 23,
            walkability_score: 0.92
        }
    },
    {
        job_name: "ai_image_detection",
        description: "Uses an advanced AI model to analyze unique images for signs of AI generation.",
        status: "SKIPPED",
        inputs_used: {},
        result: {
            reason: "No unique images provided for analysis"
        }
    },
    {
        job_name: "online_presence_analysis",
        description: "Synthesizes multiple data points (host profile, web presence, etc.) into a single verdict on the listing's online presence.",
        status: "COMPLETED",
        inputs_used: {
            host_verification: true,
            social_media_presence: "moderate",
            listing_history: "6 months"
        },
        result: {
            legitimacy_score: 0.88,
            trust_level: "high",
            recommendation: "proceed_with_confidence"
        }
    }
    // {
    //     job_name: "image_analysis_example",
    //     description: "Example step with multiple images for carousel demonstration.",
    //     status: "COMPLETED",
    //     inputs_used: {
    //         image_urls: [
    //             "https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg",
    //             "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg"
    //         ]
    //     },
    //     result: {
    //         analysis_complete: true,
    //         processed_images: [
    //             "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg",
    //             "https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg"
    //         ]
    //     }
    // }
];

const AnalysisShowcase: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-black' : 'bg-gradient-to-br from-gray-50 to-white'} py-12`}>
            <div className="max-w-4xl mx-auto px-6">
                {/* Header with Theme Toggle */}
                <div className="text-center mb-12 relative">
                    <button
                        onClick={toggleTheme}
                        className={`absolute top-0 right-0 p-3 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className={`flex items-center justify-center w-12 h-12 ${theme === 'dark' ? 'bg-yellow-400/20' : 'bg-yellow-100'} rounded-lg`}>
                            <Shield className={`w-6 h-6 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                        </div>
                        <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Forensic Analysis Dashboard
                        </h1>
                    </div>
                    <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                        Comprehensive security analysis with expandable step details and theme flexibility.
                    </p>
                </div>

                {/* Analysis Runbook */}
                <AnalysisRunbook steps={mockAnalysisSteps} theme={theme} />

                {/* Footer */}
                <div className="mt-16 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-full shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'} rounded-full animate-pulse`}></div>
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Analysis complete - {mockAnalysisSteps.filter(s => s.status === 'COMPLETED').length} steps successful</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisShowcase;