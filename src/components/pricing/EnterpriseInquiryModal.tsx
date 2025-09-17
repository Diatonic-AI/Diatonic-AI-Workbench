import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Building, Mail, User, MessageSquare } from 'lucide-react';
import { leadAPI } from '@/lib/api/leads';
import { toast } from 'sonner';

interface EnterpriseInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (leadId: string) => void;
}

interface FormData {
  name: string;
  email: string;
  company: string;
  message: string;
  consentMarketing: boolean;
  consentProcessing: boolean;
}

const EnterpriseInquiryModal: React.FC<EnterpriseInquiryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    message: '',
    consentMarketing: false,
    consentProcessing: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required';
    }

    if (!formData.consentProcessing) {
      newErrors.consentProcessing = 'You must consent to data processing to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await leadAPI.createEnterpriseInquiry(
        formData.email,
        formData.name,
        formData.company,
        formData.message || undefined
      );

      // Show success message
      toast.success('Thank you for your inquiry!', {
        description: 'Our enterprise team will contact you within 24 hours.',
        duration: 5000,
      });

      // Track successful inquiry for analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'enterprise_inquiry', {
          event_category: 'pricing',
          event_label: 'modal_form',
          value: 1,
        });
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(response.lead_id);
      }

      // Close modal and reset form
      onClose();
      setFormData({
        name: '',
        email: '',
        company: '',
        message: '',
        consentMarketing: false,
        consentProcessing: true,
      });

    } catch (error) {
      console.error('Failed to submit enterprise inquiry:', error);
      
      let errorMessage = 'Failed to submit inquiry. Please try again.';
      if (error instanceof Error && error.message.includes('already exists')) {
        errorMessage = 'An inquiry has already been submitted with this email address. Our team will contact you soon.';
      }
      
      toast.error('Submission failed', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            Enterprise Inquiry
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Full Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="pl-10"
                placeholder="John Smith"
                disabled={isLoading}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Business Email *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="pl-10"
                placeholder="john@company.com"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company" className="text-sm font-medium">
              Company Name *
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="company"
                type="text"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                className="pl-10"
                placeholder="Acme Corporation"
                disabled={isLoading}
              />
            </div>
            {errors.company && (
              <p className="text-sm text-red-600">{errors.company}</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Tell us about your needs (optional)
            </Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => updateField('message', e.target.value)}
                className="pl-10 pt-10 min-h-[100px]"
                placeholder="Tell us about your team size, use case, timeline, or specific requirements..."
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="consentProcessing"
                checked={formData.consentProcessing}
                onCheckedChange={(checked) => updateField('consentProcessing', !!checked)}
                disabled={isLoading}
                className="mt-1"
              />
              <Label htmlFor="consentProcessing" className="text-sm leading-relaxed">
                I consent to processing of my personal data to respond to my inquiry *
              </Label>
            </div>
            {errors.consentProcessing && (
              <p className="text-sm text-red-600 pl-6">{errors.consentProcessing}</p>
            )}

            <div className="flex items-start space-x-2">
              <Checkbox
                id="consentMarketing"
                checked={formData.consentMarketing}
                onCheckedChange={(checked) => updateField('consentMarketing', !!checked)}
                disabled={isLoading}
                className="mt-1"
              />
              <Label htmlFor="consentMarketing" className="text-sm leading-relaxed text-gray-600">
                I'd like to receive updates about AI Nexus Workbench features and enterprise offerings
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Send Inquiry'
              )}
            </Button>
          </div>
        </form>

        {/* Additional Info */}
        <div className="text-xs text-gray-500 pt-4 border-t">
          <p>
            Our enterprise team typically responds within 24 hours during business days.
            For urgent inquiries, please call our enterprise sales line.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnterpriseInquiryModal;