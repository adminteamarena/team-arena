import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Calendar, MapPin, Users, FileText, Trophy } from 'lucide-react';
import { auth, matches } from '../lib/supabase';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useCityContext } from '../context/CityContext';

interface MatchFormData {
  sport: string;
  date: string;
  time: string;
  location: string;
  format: string;
  description: string;
  city: string;
  isPaid: boolean;
  pricePerPerson: number;
}

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId?: string }>();
  const { selectedCity } = useCityContext();
  const [currentStep, setCurrentStep] = useState(matchId ? 2 : 1); // Start at step 2 for modify mode
  const [loading, setLoading] = useState(false);
  const [isModifyMode] = useState(!!matchId);
  const [formData, setFormData] = useState<MatchFormData>({
    sport: '',
    date: '',
    time: '',
    location: '',
    format: '',
    description: '',
    city: '',
    isPaid: false,
    pricePerPerson: 0
  });

  // Load existing match data for modify mode or auto-assign city for create mode
  useEffect(() => {
    if (matchId) {
      // Modify mode: load existing match data
      loadMatchData(matchId);
    } else if (selectedCity) {
      // Create mode: auto-assign selected city
      setFormData(prev => ({ ...prev, city: selectedCity }));
    }
  }, [matchId, selectedCity]);

  const loadMatchData = async (id: string) => {
    setLoading(true);
    try {
      const { data: match, error } = await matches.getMatch(id);
      if (error) {
        console.error('Error loading match:', error);
        alert('Failed to load match data');
        navigate('/matches');
        return;
      }
      
      if (match) {
        // Pre-populate form with existing match data
        setFormData({
          sport: match.sport_type,
          date: match.date,
          time: match.time,
          location: match.location.split(',')[0], // Remove city from location
          format: match.team_format,
          description: match.description || '',
          city: match.location.includes(',') ? match.location.split(',')[1].trim() : selectedCity || '',
          isPaid: match.is_paid || false,
          pricePerPerson: match.price_per_person || 0
        });
      }
    } catch (error) {
      console.error('Error loading match:', error);
      alert('Failed to load match data');
      navigate('/matches');
    } finally {
      setLoading(false);
    }
  };

  const sports = [
    { id: 'Football', name: 'Football', emoji: '⚽' },
    { id: 'Basketball', name: 'Basketball', emoji: '🏀' },
    { id: 'Tennis', name: 'Tennis', emoji: '🎾' },
    { id: 'Volleyball', name: 'Volleyball', emoji: '🏐' },
    { id: 'Baseball', name: 'Baseball', emoji: '⚾' },
    { id: 'Hockey', name: 'Hockey', emoji: '🏒' },
    { id: 'Golf', name: 'Golf', emoji: '⛳' },
    { id: 'Swimming', name: 'Swimming', emoji: '🏊' },
    { id: 'Boxing', name: 'Boxing', emoji: '🥊' },
    { id: 'Footing', name: 'Footing', emoji: '🏃' },
    { id: 'Padel', name: 'Padel', emoji: '🏓' }
  ];

  const formats = [
    { value: '1v1', label: '1 vs 1', players: 2 },
    { value: '2v2', label: '2 vs 2', players: 4 },
    { value: '3v3', label: '3 vs 3', players: 6 },
    { value: '4v4', label: '4 vs 4', players: 8 },
    { value: '5v5', label: '5 vs 5', players: 10 },
    { value: '6v6', label: '6 vs 6', players: 12 },
    { value: '7v7', label: '7 vs 7', players: 14 },
    { value: '8v8', label: '8 vs 8', players: 16 },
    { value: '9v9', label: '9 vs 9', players: 18 },
    { value: '10v10', label: '10 vs 10', players: 20 },
    { value: '11v11', label: '11 vs 11', players: 22 }
  ];

  const steps = isModifyMode ? [
    { number: 2, title: 'Details', icon: Calendar, description: 'Date, time & location' },
    { number: 3, title: 'Format', icon: Users, description: 'Match format' },
    { number: 4, title: 'Description', icon: FileText, description: 'Optional details' }
  ] : [
    { number: 1, title: 'Sport', icon: Trophy, description: 'Choose your sport' },
    { number: 2, title: 'Details', icon: Calendar, description: 'Date, time & location' },
    { number: 3, title: 'Format', icon: Users, description: 'Match format' },
    { number: 4, title: 'Description', icon: FileText, description: 'Optional details' }
  ];

  const handleNext = () => {
    const maxStep = 4;
    if (currentStep < maxStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    const minStep = isModifyMode ? 2 : 1;
    if (currentStep > minStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSportSelect = (sport: string) => {
    setFormData({ ...formData, sport });
    handleNext();
  };

  const handleFormatSelect = (format: string) => {
    setFormData({ ...formData, format });
    handleNext();
  };

  const generateMatchTitle = () => {
    const selectedSport = sports.find(s => s.id === formData.sport);
    return `${selectedSport?.name || 'Sports'} ${formData.format} Match`;
  };

  const handleCreateMatch = async () => {
    setLoading(true);
    try {
      const actionText = isModifyMode ? 'updating' : 'creating';
      console.log(`🚀 Starting match ${actionText}...`);
      
      const { user } = await auth.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('✅ User authenticated:', user.id);

      const selectedFormat = formats.find(f => f.value === formData.format);
      
      // Include city in location if selected
      const fullLocation = formData.city 
        ? `${formData.location}, ${formData.city}`
        : formData.location;
      
      const matchData = {
        title: generateMatchTitle(),
        sport_type: formData.sport,
        location: fullLocation,
        date: formData.date,
        time: formData.time,
        max_players: selectedFormat?.players || 10,
        team_format: formData.format,
        status: 'upcoming' as const,
        organizer_id: user.id,
        description: formData.description || undefined,
        ready_check_started: false,
        weather_condition: 'indoor' as const,
        is_paid: formData.isPaid,
        price_per_person: formData.isPaid ? formData.pricePerPerson : 0,
        currency: 'MAD'
      };

      console.log(`📝 Match data to be ${isModifyMode ? 'updated' : 'created'}:`, matchData);

      let result;
      if (isModifyMode && matchId) {
        // Update existing match
        result = await matches.updateMatch(matchId, matchData);
      } else {
        // Create new match
        result = await matches.createMatch(matchData);
      }
      
      const { data, error } = result;
      
      if (error) {
        console.error(`❌ Database error during ${actionText}:`, error);
        throw error;
      }

      console.log(`🎉 Match ${isModifyMode ? 'updated' : 'created'} successfully!`, data);

      // Show success message
      alert(`✅ Match "${data?.title || generateMatchTitle()}" ${isModifyMode ? 'updated' : 'created'} successfully!`);

      // Navigate back to matches page with a refresh parameter to force reload
      navigate(`/matches?refresh=${Date.now()}`, { replace: true });
    } catch (error) {
      console.error(`❌ Error ${isModifyMode ? 'updating' : 'creating'} match:`, error);
      
      // Show user-friendly error message
      alert(`❌ Failed to ${isModifyMode ? 'update' : 'create'} match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.sport !== '';
      case 2:
        return formData.date !== '' && formData.time !== '' && formData.location !== '' && 
               (!formData.isPaid || formData.pricePerPerson > 0);
      case 3:
        return formData.format !== '';
      case 4:
        return true; // Description is optional (max 80 characters)
      default:
        return false;
    }
  };

  const canProceed = () => {
    return isStepValid();
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-6 sm:mb-8 px-4">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              currentStep > step.number
                ? 'bg-green-500 text-white'
                : currentStep === step.number
                ? 'bg-primary-orange text-white'
                : 'bg-white/20 text-white/60'
            }`}
          >
            {currentStep > step.number ? (
              <Check size={14} className="sm:w-4 sm:h-4" />
            ) : (
              <step.icon size={14} className="sm:w-4 sm:h-4" />
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={`w-6 sm:w-12 h-0.5 mx-1 sm:mx-2 transition-all duration-300 ${
              currentStep > step.number ? 'bg-green-500' : 'bg-white/20'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 sm:space-y-6 px-4">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Choose Your Sport</h2>
              <p className="text-white/60 text-sm sm:text-base">Select the sport you want to play</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => handleSportSelect(sport.id)}
                  className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                    formData.sport === sport.id
                      ? 'bg-primary-orange/20 border-primary-orange text-white'
                      : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40'
                  }`}
                >
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{sport.emoji}</div>
                  <div className="font-semibold text-sm sm:text-base">{sport.name}</div>
                </button>
              ))}
            </div>
          </div>
        );

            case 2:
        return (
          <div className="space-y-4 sm:space-y-6 px-4">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Match Details</h2>
              <p className="text-white/60 text-sm sm:text-base">When and where will the match take place?</p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  📅 Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  🕒 Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent text-sm sm:text-base"
                />
              </div>

              <div>
                <Input
                  type="text"
                  label={`📍 Location${formData.city ? ` in ${formData.city}` : ''}`}
                  placeholder={`Enter location ${formData.city ? `in ${formData.city}` : '(e.g., Central Park Field A)'}`}
                  value={formData.location}
                  onChange={(value) => setFormData({ ...formData, location: value })}
                  className="w-full"
                />
                {formData.city && (
                  <p className="text-xs text-white/60 mt-1">
                    📍 This match will be posted in {formData.city}
                  </p>
                )}
              </div>

              {/* Payment Toggle */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">💰</span>
                    <label className="block text-white/80 text-sm font-medium">
                      Match Type
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newIsPaid = !formData.isPaid;
                      setFormData({ 
                        ...formData, 
                        isPaid: newIsPaid,
                        pricePerPerson: newIsPaid ? formData.pricePerPerson || 50 : 0
                      });
                    }}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-orange focus:ring-offset-2 focus:ring-offset-gray-800 ${
                      formData.isPaid ? 'bg-primary-orange' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white transition-transform text-[8px] font-bold ${
                        formData.isPaid ? 'translate-x-9 text-primary-orange' : 'translate-x-1 text-gray-600'
                      }`}
                    >
                      {formData.isPaid ? 'PAY' : 'FREE'}
                    </span>
                  </button>
                </div>
                
                {/* Price Input - Only show when paid is selected */}
                {formData.isPaid && (
                  <div className="mt-3">
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      💳 Price per person (MAD)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                        value={formData.pricePerPerson || ''}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === '') {
                            setFormData({ ...formData, pricePerPerson: 0 });
                          } else {
                            const numValue = parseInt(inputValue);
                            if (!isNaN(numValue)) {
                              const clampedValue = Math.max(1, Math.min(1000, numValue));
                              setFormData({ ...formData, pricePerPerson: clampedValue });
                            }
                          }
                        }}
                        className="w-full p-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent text-sm sm:text-base"
                        placeholder="50"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 text-sm font-medium">
                        MAD
                      </div>
                    </div>
                    <p className="text-white/60 text-xs mt-1">
                      Set a fair price that covers venue and equipment costs
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 sm:space-y-6 px-4">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Match Format</h2>
              <p className="text-white/60 text-sm sm:text-base">How many players per team?</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {formats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => handleFormatSelect(format.value)}
                  className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                    formData.format === format.value
                      ? 'bg-primary-orange/20 border-primary-orange text-white'
                      : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40'
                  }`}
                >
                  <div className="font-bold text-base sm:text-lg mb-1">{format.label}</div>
                  <div className="text-xs sm:text-sm text-white/60">{format.players} players</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 sm:space-y-6 px-4">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Description</h2>
              <p className="text-white/60 text-sm sm:text-base">Add brief details (max 80 characters, optional)</p>
            </div>

            <div className="w-full max-w-md mx-auto px-4">
              <div className="relative w-full max-w-full">
                <textarea
                  placeholder="Brief match description..."
                  value={formData.description}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (newValue.length <= 80) {
                      setFormData({ ...formData, description: newValue });
                    }
                  }}
                  maxLength={80}
                  rows={3}
                  className="w-full min-w-0 max-w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent resize-none text-sm sm:text-base leading-relaxed box-border block"
                  style={{
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    maxWidth: '100%',
                    width: '100%',
                    minWidth: '0',
                    wordBreak: 'break-word'
                  }}
                />
                <div className="absolute bottom-2 right-2 text-white/60 text-xs bg-black/30 px-2 py-1 rounded pointer-events-none">
                  {formData.description.length}/80
                </div>
              </div>
              <div className="text-right text-white/60 text-sm mt-2">
                {formData.description.length}/80 characters
              </div>
            </div>

            {/* Match Preview */}
            <Card className="max-w-md mx-auto">
              <div className="p-4">
                <h3 className="text-white font-bold mb-2 text-sm sm:text-base">Match Preview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-white/80">
                    <span className="text-base sm:text-lg mr-2 flex-shrink-0">
                      {sports.find(s => s.id === formData.sport)?.emoji}
                    </span>
                    <span className="truncate">{generateMatchTitle()}</span>
                  </div>
                  <div className="flex items-center text-white/80">
                    <Calendar size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{formData.date} at {formData.time}</span>
                  </div>
                  <div className="flex items-center text-white/80">
                    <MapPin size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">
                      {formData.location}
                      {formData.city && ` - ${formData.city}`}
                    </span>
                  </div>
                  <div className="flex items-center text-white/80">
                    <Users size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{formData.format} Format</span>
                  </div>
                  <div className="flex items-center text-white/80">
                    <span className="text-base sm:text-lg mr-2 flex-shrink-0">💰</span>
                    <span className="truncate">
                      {formData.isPaid ? `${formData.pricePerPerson} MAD /U` : 'FREE'}
                    </span>
                  </div>
                  {formData.description && (
                    <div className="text-white/60 text-xs mt-2 p-2 bg-white/5 rounded break-words">
                      {formData.description}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Creating your match..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark p-4 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <button
            onClick={() => navigate('/matches')}
            className="flex items-center text-white/60 hover:text-white transition-colors text-sm sm:text-base"
          >
            <ArrowLeft size={16} className="mr-2 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Back to Matches</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="text-center">
            <div className="text-white/60 text-xs sm:text-sm">
              Step {isModifyMode ? currentStep - 1 : currentStep} of {steps.length}
            </div>
            {isModifyMode && (
              <div className="text-primary-orange text-xs font-semibold">
                Modify Mode
              </div>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="mb-6 sm:mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center max-w-md mx-auto px-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === (isModifyMode ? 2 : 1)}
            className="flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3"
          >
            <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
            <span className="text-sm sm:text-base">Back</span>
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3"
            >
              <span className="text-sm sm:text-base">Next</span>
              <ArrowRight size={14} className="sm:w-4 sm:h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateMatch}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3"
            >
              <Check size={14} className="sm:w-4 sm:h-4" />
              <span className="text-sm sm:text-base">{isModifyMode ? 'Update Match' : 'Create Match'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateMatch; 