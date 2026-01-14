// ============================================
// Contacts Store - Contact Management
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Contact, ContactFormData } from '@/types/contact';
import { createContactId, sortContacts, searchContacts } from '@/types/contact';

interface ContactsState {
  // Data
  contacts: Contact[];
  
  // UI state
  searchQuery: string;
  selectedContactId: string | null;
  
  // Computed
  filteredContacts: Contact[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedContact: (id: string | null) => void;
  
  // CRUD
  addContact: (data: ContactFormData) => Contact;
  updateContact: (id: string, data: ContactFormData) => void;
  deleteContact: (id: string) => void;
  deleteAllContacts: () => void;
  
  // Import/Export
  importContacts: (contacts: Contact[]) => void;
  exportContacts: () => Contact[];
  
  // Lookup
  findContactByNumber: (phoneNumber: string) => Contact | undefined;
}

export const useContactsStore = create<ContactsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        contacts: [],
        searchQuery: '',
        selectedContactId: null,
        filteredContacts: [],
        
        // Search
        setSearchQuery: (searchQuery) => {
          const contacts = get().contacts;
          const sorted = sortContacts(contacts);
          const filteredContacts = searchContacts(sorted, searchQuery);
          set({ searchQuery, filteredContacts });
        },
        
        setSelectedContact: (selectedContactId) => set({ selectedContactId }),
        
        // Add contact
        addContact: (data) => {
          const newContact: Contact = {
            id: createContactId(),
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          set((state) => {
            const contacts = [...state.contacts, newContact];
            const sorted = sortContacts(contacts);
            const filteredContacts = searchContacts(sorted, state.searchQuery);
            return { contacts, filteredContacts };
          });
          
          return newContact;
        },
        
        // Update contact
        updateContact: (id, data) => {
          set((state) => {
            const contacts = state.contacts.map((contact) =>
              contact.id === id
                ? { ...contact, ...data, updatedAt: Date.now() }
                : contact
            );
            const sorted = sortContacts(contacts);
            const filteredContacts = searchContacts(sorted, state.searchQuery);
            return { contacts, filteredContacts };
          });
        },
        
        // Delete contact
        deleteContact: (id) => {
          set((state) => {
            const contacts = state.contacts.filter((c) => c.id !== id);
            const sorted = sortContacts(contacts);
            const filteredContacts = searchContacts(sorted, state.searchQuery);
            return { 
              contacts, 
              filteredContacts,
              selectedContactId: state.selectedContactId === id ? null : state.selectedContactId
            };
          });
        },
        
        // Delete all contacts
        deleteAllContacts: () => {
          set({ 
            contacts: [], 
            filteredContacts: [],
            selectedContactId: null,
            searchQuery: ''
          });
        },
        
        // Import contacts
        importContacts: (importedContacts) => {
          set((state) => {
            // Merge with existing, avoiding duplicates by phone number
            const existingNumbers = new Set(state.contacts.map((c) => c.phoneNumber));
            const newContacts = importedContacts.filter((c) => !existingNumbers.has(c.phoneNumber));
            const contacts = [...state.contacts, ...newContacts];
            const sorted = sortContacts(contacts);
            const filteredContacts = searchContacts(sorted, state.searchQuery);
            return { contacts, filteredContacts };
          });
        },
        
        // Export contacts
        exportContacts: () => {
          return get().contacts;
        },
        
        // Find contact by phone number
        findContactByNumber: (phoneNumber) => {
          const normalized = phoneNumber.replace(/[^0-9+]/g, '');
          return get().contacts.find((contact) => {
            const contactNumber = contact.phoneNumber.replace(/[^0-9+]/g, '');
            return contactNumber === normalized || 
                   normalized.endsWith(contactNumber) || 
                   contactNumber.endsWith(normalized);
          });
        }
      }),
      {
        name: 'contacts-store',
        partialize: (state) => ({
          contacts: state.contacts
        }),
        onRehydrateStorage: () => (state) => {
          // Re-compute filtered contacts after rehydration
          if (state) {
            const sorted = sortContacts(state.contacts);
            state.filteredContacts = searchContacts(sorted, state.searchQuery);
          }
        }
      }
    ),
    { name: 'contacts-store' }
  )
);
