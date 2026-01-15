// ============================================
// Contact Types
// ============================================

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ContactFormData {
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber: string;
}

export function createContactId(): string {
  return `contact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getContactDisplayName(contact: Contact): string {
  if (contact.companyName) {
    return contact.companyName;
  }
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  return fullName || contact.phoneNumber;
}

export function getContactSecondaryName(contact: Contact): string | null {
  if (contact.companyName && (contact.firstName || contact.lastName)) {
    return `${contact.firstName} ${contact.lastName}`.trim();
  }
  return null;
}

export function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    // Sort by company name first, then last name, then first name
    const aCompany = a.companyName.toLowerCase();
    const bCompany = b.companyName.toLowerCase();
    if (aCompany !== bCompany) {
      if (!aCompany) return 1;
      if (!bCompany) return -1;
      return aCompany.localeCompare(bCompany);
    }
    
    const aLast = a.lastName.toLowerCase();
    const bLast = b.lastName.toLowerCase();
    if (aLast !== bLast) {
      return aLast.localeCompare(bLast);
    }
    
    return a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
  });
}

export function searchContacts(contacts: Contact[], query: string): Contact[] {
  if (!query.trim()) return contacts;
  
  const lowerQuery = query.toLowerCase();
  return contacts.filter(contact => 
    contact.firstName.toLowerCase().includes(lowerQuery) ||
    contact.lastName.toLowerCase().includes(lowerQuery) ||
    contact.companyName.toLowerCase().includes(lowerQuery) ||
    contact.phoneNumber.includes(query)
  );
}
