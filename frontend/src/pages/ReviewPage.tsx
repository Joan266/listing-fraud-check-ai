import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setExtractedData, startAnalysis } from '../store/appSlice';
import { ExtractedListingData, Message } from '../types';
import MapComponent from '../components/UI/MapComponent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ReviewPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { sessionId, extractedData, status } = useAppSelector(
        (state) => state.app
    );

    if (!extractedData || !sessionId) {
        navigate('/');
        return null;
    }

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        const keys = name.split('.');

        const updatedData: ExtractedListingData = JSON.parse(JSON.stringify(extractedData));
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let currentLevel: any = updatedData;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            // If a nested level is null or undefined, create an empty object
            if (currentLevel[key] === null || currentLevel[key] === undefined) {
                currentLevel[key] = {};
            }
            currentLevel = currentLevel[key];
        }

        // Handle number conversion for price amount
        if (name === 'price_details.amount') {
             currentLevel[keys[keys.length - 1]] = value === '' ? null : Number(value);
        } else {
             currentLevel[keys[keys.length - 1]] = value;
        }

        dispatch(setExtractedData(updatedData));
    };

    const handleImageChange = (index: number, value: string) => {
        const updatedImages = [...(extractedData.image_urls || [])];
        updatedImages[index] = value;
        dispatch(setExtractedData({ ...extractedData, image_urls: updatedImages }));
    };

    const addImageField = () => {
        const updatedImages = [...(extractedData.image_urls || []), ''];
        dispatch(setExtractedData({ ...extractedData, image_urls: updatedImages }));
    };

    const removeImageField = (index: number) => {
        const updatedImages = (extractedData.image_urls || []).filter((_, i) => i !== index);
        dispatch(setExtractedData({ ...extractedData, image_urls: updatedImages }));
    };

    const handleAddressChange = (newAddress: string) => {
        dispatch(setExtractedData({ ...extractedData, address: newAddress }));
    };

    const handleSubmit = () => {
        if (!sessionId || !extractedData) {
            toast.error('Session or data is missing. Please start over.');
            navigate('/');
            return;
        }

        const initialUserMessage: Message = {
            role: 'user',
            content: `Initial data for analysis: ${JSON.stringify(extractedData)}`,
        };

        const payload = {
            ...extractedData,
            session_id: sessionId,
            chat_history: [initialUserMessage],
        };

        dispatch(startAnalysis(payload));
        navigate('/results');
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-2 text-center">Review Extracted Data</h1>
            <p className="text-muted-foreground text-center mb-8">
                Please verify the information extracted by the AI. You can edit any field before starting the full analysis.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Listing Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="listing_url">Listing URL</Label>
                                <Input id="listing_url" name="listing_url" value={extractedData.listing_url || ''} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" name="description" className="h-32" value={extractedData.description || ''} onChange={handleInputChange} />
                            </div>
                             <div>
                                <Label htmlFor="communication_text">Communication Text</Label>
                                <Textarea id="communication_text" name="communication_text" className="h-32" value={extractedData.communication_text || ''} onChange={handleInputChange} />
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Price Details</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <Label htmlFor="price_details.amount">Amount</Label>
                                <Input id="price_details.amount" name="price_details.amount" type="number" value={extractedData.price_details?.amount || ''} onChange={handleInputChange}/>
                            </div>
                             <div>
                                <Label htmlFor="price_details.currency">Currency</Label>
                                <Input id="price_details.currency" name="price_details.currency" value={extractedData.price_details?.currency || ''} onChange={handleInputChange}/>
                            </div>
                            <div>
                                <Label htmlFor="price_details.period">Period</Label>
                                <Input id="price_details.period" name="price_details.period" value={extractedData.price_details?.period || ''} onChange={handleInputChange}/>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Image URLs</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {(extractedData.image_urls || []).map((url, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input value={url} onChange={(e) => handleImageChange(index, e.target.value)} placeholder={`Image URL ${index + 1}`} />
                                    <Button variant="ghost" size="icon" onClick={() => removeImageField(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addImageField}><PlusCircle className="h-4 w-4 mr-2" />Add Image URL</Button>
                        </CardContent>
                    </Card>
                </div>
                {/* Right Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" name="address" value={extractedData.address || ''} onChange={handleInputChange} />
                            </div>
                            <div className="h-80 rounded-lg overflow-hidden">
                               <MapComponent address={extractedData.address || ''} onAddressChange={handleAddressChange} />
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Host Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="host_name">Host Name</Label>
                                <Input id="host_name" name="host_name" value={extractedData.host_name || ''} onChange={handleInputChange} />
                            </div>
                             <div>
                                <Label htmlFor="host_profile.profile_url">Host Profile URL</Label>
                                <Input id="host_profile.profile_url" name="host_profile.profile_url" value={extractedData.host_profile?.profile_url || ''} onChange={handleInputChange} />
                            </div>
                             <div>
                                <Label htmlFor="host_profile.member_since">Member Since</Label>
                                <Input id="host_profile.member_since" name="host_profile.member_since" value={extractedData.host_profile?.member_since || ''} onChange={handleInputChange} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            <div className="mt-8 flex justify-center">
                <Button size="lg" onClick={handleSubmit} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Analyzing...' : 'Start Full Analysis'}
                </Button>
            </div>
        </div>
    );
};

export default ReviewPage;
