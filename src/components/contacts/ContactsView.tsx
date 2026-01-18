// ============================================
// Contacts View - Contact list and management
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, User, Phone, Pencil, Trash2, MoreVertical, Building2 } from 'lucide-react';
import { PanelHeader } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { ContactModal, ConfirmModal } from '@/components/modals';
import { useContactsStore, useAppStore } from '@/stores';
import { useSIP } from '@/hooks';
import { getContactDisplayName, getContactSecondaryName, type Contact } from '@/types/contact';
import { isVerboseLoggingEnabled } from '@/utils';

export function ContactsView() {
  const { t } = useTranslation();
  const { isRegistered } = useSIP();
  const switchToDialWithNumber = useAppStore((state) => state.switchToDialWithNumber);
  
  // Store state
  const contacts = useContactsStore((state) => state.filteredContacts);
  const searchQuery = useContactsStore((state) => state.searchQuery);
  const setSearchQuery = useContactsStore((state) => state.setSearchQuery);
  const deleteContact = useContactsStore((state) => state.deleteContact);
  const deleteAllContacts = useContactsStore((state) => state.deleteAllContacts);
  
  // Local UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  const handleAddContact = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };
  
  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
    setActiveMenu(null);
  };
  
  const handleDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setIsDeleteConfirmOpen(true);
    setActiveMenu(null);
  };
  
  const confirmDeleteContact = () => {
    if (contactToDelete) {
      deleteContact(contactToDelete.id);
      setContactToDelete(null);
    }
  };
  
  const handleCall = (contact: Contact) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[ContactsView] 📞 Call button clicked:', {
        phoneNumber: contact.phoneNumber,
        name: getContactDisplayName(contact),
        isRegistered
      });
    }
    
    if (isRegistered) {
      // Switch to dial tab and populate the number
      switchToDialWithNumber(contact.phoneNumber);
      
      if (verboseLogging) {
        console.log('[ContactsView] ✅ Switched to dial tab with number:', contact.phoneNumber);
      }
    } else {
      if (verboseLogging) {
        console.warn('[ContactsView] ⚠️ Cannot call - not registered');
      }
    }
    setActiveMenu(null);
  };
  
  const toggleMenu = (contactId: string) => {
    setActiveMenu(activeMenu === contactId ? null : contactId);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);
  
  return (
    <div className="contacts-view">
      <PanelHeader 
        title={t('contacts.title', 'Contacts')}
        subtitle={contacts.length > 0 ? t('contacts.count', '{{count}} contacts', { count: contacts.length }) : undefined}
        actions={
          <div className="header-actions">
            {contacts.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-error"
                onClick={() => setIsDeleteAllConfirmOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleAddContact}>
              <Plus className="w-4 h-4" />
              {t('contacts.add', 'Add')}
            </Button>
          </div>
        }
      />
      
      <div className="contacts-search">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('contacts.search_placeholder', 'Search contacts...')}
          icon={<Search className="w-4 h-4" />}
        />
      </div>
      
      <div className="contacts-list">
        {contacts.length === 0 ? (
          <div className="empty-state">
            <User className="empty-state-icon" />
            <h3>{t('contacts.empty_title', 'No contacts yet')}</h3>
            <p>{t('contacts.empty_description', 'Add your first contact to get started')}</p>
          </div>
        ) : (
          <div className="contacts-items">
            {contacts.map((contact) => {
              const displayName = getContactDisplayName(contact);
              const secondaryName = getContactSecondaryName(contact);
              
              return (
                <div key={contact.id} className="contact-item">
                  <div className="contact-avatar">
                    {contact.companyName ? (
                      <Building2 className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="contact-info">
                    <div className="contact-name">{displayName}</div>
                    {secondaryName && (
                      <div className="contact-secondary">{secondaryName}</div>
                    )}
                    <div className="contact-phone">{contact.phoneNumber}</div>
                  </div>
                  
                  <div className="contact-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCall(contact)}
                      disabled={!isRegistered}
                      title={t('contacts.call', 'Call')}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    
                    <div className="contact-menu-container">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMenu(contact.id);
                        }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      
                      {activeMenu === contact.id && (
                        <div className="contact-menu" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleEditContact(contact)}>
                            <Pencil className="w-4 h-4" />
                            {t('common.edit', 'Edit')}
                          </button>
                          <button onClick={() => handleDeleteContact(contact)} className="text-error">
                            <Trash2 className="w-4 h-4" />
                            {t('common.delete', 'Delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Add/Edit Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContact(null);
        }}
        contact={editingContact}
      />
      
      {/* Delete Single Confirm */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setContactToDelete(null);
        }}
        onConfirm={confirmDeleteContact}
        title={t('contacts.delete_title', 'Delete Contact')}
        message={t('contacts.delete_message', 'Are you sure you want to delete {{name}}?', {
          name: contactToDelete ? getContactDisplayName(contactToDelete) : ''
        })}
        confirmText={t('common.delete', 'Delete')}
        variant="danger"
      />
      
      {/* Delete All Confirm */}
      <ConfirmModal
        isOpen={isDeleteAllConfirmOpen}
        onClose={() => setIsDeleteAllConfirmOpen(false)}
        onConfirm={deleteAllContacts}
        title={t('contacts.delete_all_title', 'Delete All Contacts')}
        message={t('contacts.delete_all_message', 'Are you sure you want to delete all {{count}} contacts? This cannot be undone.', {
          count: contacts.length
        })}
        confirmText={t('contacts.delete_all', 'Delete All')}
        variant="danger"
      />
    </div>
  );
}
