// ============================================
// Contact Modal - Add/Edit Contact Form
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Building2, Phone } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useContactsStore } from '@/stores';
import type { Contact, ContactFormData } from '@/types/contact';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: Contact | null;
}

export function ContactModal({ isOpen, onClose, contact }: ContactModalProps) {
  const { t } = useTranslation();
  
  const addContact = useContactsStore((state) => state.addContact);
  const updateContact = useContactsStore((state) => state.updateContact);
  
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    companyName: '',
    phoneNumber: ''
  });
  const [error, setError] = useState<string | null>(null);
  
  const isEditing = !!contact;
  
  // Initialize form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    if (contact) {
      setFormData({
        firstName: contact.firstName,
        lastName: contact.lastName,
        companyName: contact.companyName,
        phoneNumber: contact.phoneNumber
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        companyName: '',
        phoneNumber: ''
      });
    }
    setError(null);
  }, [isOpen, contact]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!formData.phoneNumber.trim()) {
      setError(t('contacts.error_phone_required', 'Phone number is required'));
      return;
    }
    
    if (!formData.firstName.trim() && !formData.lastName.trim() && !formData.companyName.trim()) {
      setError(t('contacts.error_name_required', 'Please enter a name or company'));
      return;
    }
    
    if (isEditing && contact) {
      updateContact(contact.id, formData);
    } else {
      addContact(formData);
    }
    
    onClose();
  };
  
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? t('contacts.edit_title', 'Edit Contact') : t('contacts.add_title', 'Add Contact')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label>{t('contacts.first_name', 'First Name')}</label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder={t('contacts.first_name_placeholder', 'John')}
                icon={<User className="w-4 h-4" />}
              />
            </div>
            
            <div className="form-group">
              <label>{t('contacts.last_name', 'Last Name')}</label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder={t('contacts.last_name_placeholder', 'Smith')}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>{t('contacts.company_name', 'Company Name')}</label>
            <Input
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder={t('contacts.company_placeholder', 'Acme Inc.')}
              icon={<Building2 className="w-4 h-4" />}
            />
          </div>
          
          <div className="form-group">
            <label>{t('contacts.phone_number', 'Phone Number')} *</label>
            <Input
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder={t('contacts.phone_placeholder', '+1 555 123 4567')}
              icon={<Phone className="w-4 h-4" />}
              required
            />
          </div>
          
          <div className="modal-footer">
            <Button variant="ghost" type="button" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {isEditing ? t('common.save', 'Save') : t('contacts.add', 'Add Contact')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
