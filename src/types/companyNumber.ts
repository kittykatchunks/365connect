// ============================================
// Company Number Types
// ============================================

export interface CompanyNumber {
  company_id: number; // 1-99
  name: string;
  cid: string; // Caller ID number
}

export interface CompanyNumberFormData {
  company_id: number;
  name: string;
  cid: string;
}

// Validation returns translation key instead of translated string
export function validateCompanyNumber(data: Partial<CompanyNumberFormData>): string | null {
  if (!data.company_id || data.company_id < 1 || data.company_id > 99) {
    return 'error_company_id_range';
  }
  
  if (!data.name?.trim()) {
    return 'error_company_name_required';
  }
  
  if (!data.cid?.trim()) {
    return 'error_company_number_required';
  }
  
  return null;
}

export function sortCompanyNumbers(companies: CompanyNumber[]): CompanyNumber[] {
  return [...companies].sort((a, b) => a.company_id - b.company_id);
}

export function findCompanyByNumber(companies: CompanyNumber[], phoneNumber: string): CompanyNumber | undefined {
  // Normalize the phone number for comparison
  const normalized = phoneNumber.replace(/[^0-9+]/g, '');
  
  return companies.find(company => {
    const companyCid = company.cid.replace(/[^0-9+]/g, '');
    return companyCid === normalized || normalized.endsWith(companyCid) || companyCid.endsWith(normalized);
  });
}
