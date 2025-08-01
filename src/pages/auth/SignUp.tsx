import { FC, useState, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Camera } from 'lucide-react';
import { auth } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Logo from '../../components/ui/Logo';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  acceptTerms: boolean;
  profilePicture?: File;
}

const SignUp: FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    acceptTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.acceptTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
    }

    if (isValid) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      const { error } = await auth.signUp(formData.email, formData.password, {
        username: formData.username,
        full_name: formData.fullName,
        profile_picture: formData.profilePicture
      });

      if (error) {
        setErrors({ general: error.message });
      } else {
        alert('Account created successfully! Please check your email to verify your account.');
        navigate('/login');
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, profilePicture: file });
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Basic Information</h3>
        <p className="text-white/60 text-sm">Let's start with your account details</p>
      </div>

      <Input
        type="text"
        label="Username"
        value={formData.username}
        onChange={(value) => setFormData({ ...formData, username: value })}
        error={errors.username}
        placeholder="Choose a unique username"
        required
      />

      <Input
        type="email"
        label="Email"
        value={formData.email}
        onChange={(value) => setFormData({ ...formData, email: value })}
        error={errors.email}
        placeholder="Enter your email address"
        required
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Security</h3>
        <p className="text-white/60 text-sm">Create a strong password for your account</p>
      </div>

      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Password"
          value={formData.password}
          onChange={(value) => setFormData({ ...formData, password: value })}
          error={errors.password}
          placeholder="Create a strong password"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      <div className="relative">
        <Input
          type={showConfirmPassword ? 'text' : 'password'}
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
          error={errors.confirmPassword}
          placeholder="Confirm your password"
          required
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
        >
          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Profile Setup</h3>
        <p className="text-white/60 text-sm">Complete your profile information</p>
      </div>

      <Input
        type="text"
        label="Full Name"
        value={formData.fullName}
        onChange={(value) => setFormData({ ...formData, fullName: value })}
        error={errors.fullName}
        placeholder="Enter your full name"
        required
      />

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Profile Picture (Optional)
        </label>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
            {formData.profilePicture ? (
              <img
                src={URL.createObjectURL(formData.profilePicture)}
                alt="Profile preview"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Camera size={24} className="text-white/60" />
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="profile-picture"
          />
          <label
            htmlFor="profile-picture"
            className="btn-outline cursor-pointer"
          >
            Choose Photo
          </label>
        </div>
      </div>

      <div>
        <label className="flex items-start space-x-3 text-white/80">
          <input
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, acceptTerms: e.target.checked })}
            className="mt-1 rounded border-white/30 bg-white/10"
          />
          <span className="text-sm">
            I agree to the{' '}
            <Link to="/terms" className="text-primary-orange hover:text-primary-pink">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-primary-orange hover:text-primary-pink">
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.terms && (
          <p className="text-red-400 text-sm mt-1">{errors.terms}</p>
        )}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-purple-900 to-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="mb-8 text-center">
            <Logo size="lg" />
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step <= currentStep
                      ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="w-full bg-white/10 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-primary-orange to-primary-pink h-1 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>

          {renderCurrentStep()}

          {errors.general && (
            <div className="mt-6 text-red-400 text-sm text-center bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              {errors.general}
            </div>
          )}

          <div className="flex space-x-4 mt-8">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              loading={loading && currentStep === 3}
              disabled={loading}
              className="flex-1"
            >
              {currentStep === 3 ? 'Create Account' : 'Next'}
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/60 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary-orange hover:text-primary-pink transition-colors font-semibold"
              >
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SignUp; 