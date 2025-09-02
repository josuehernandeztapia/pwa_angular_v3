import { AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';

export class CustomValidators {
  
  /**
   * Validator for Mexican currency format
   */
  static mexicanCurrency(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = control.value.toString().replace(/[\s$,]/g, '');
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue < 0) {
      return { mexicanCurrency: { value: control.value } };
    }
    
    return null;
  }

  /**
   * Validator for minimum currency amount
   */
  static minCurrency(minAmount: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString().replace(/[\s$,]/g, '');
      const numValue = parseFloat(value);
      
      if (isNaN(numValue) || numValue < minAmount) {
        return { 
          minCurrency: { 
            actual: numValue,
            required: minAmount,
            message: `El monto mínimo es ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(minAmount)}`
          } 
        };
      }
      
      return null;
    };
  }

  /**
   * Validator for maximum currency amount
   */
  static maxCurrency(maxAmount: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString().replace(/[\s$,]/g, '');
      const numValue = parseFloat(value);
      
      if (isNaN(numValue) || numValue > maxAmount) {
        return { 
          maxCurrency: { 
            actual: numValue,
            required: maxAmount,
            message: `El monto máximo es ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(maxAmount)}`
          } 
        };
      }
      
      return null;
    };
  }

  /**
   * Validator for percentage values
   */
  static percentage(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = parseFloat(control.value);
    
    if (isNaN(value) || value < 0 || value > 100) {
      return { percentage: { value: control.value } };
    }
    
    return null;
  }

  /**
   * Validator for Mexican phone numbers
   */
  static mexicanPhone(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const phoneRegex = /^(\+52\s?)?(\d{2}\s?\d{4}\s?\d{4}|\d{3}\s?\d{3}\s?\d{4})$/;
    
    if (!phoneRegex.test(control.value)) {
      return { mexicanPhone: { value: control.value } };
    }
    
    return null;
  }

  /**
   * Validator for Mexican RFC (Registro Federal de Contribuyentes)
   */
  static rfc(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // Simplified RFC validation (real validation is more complex)
    const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-V1-9][A-Z1-9][0-9A]$/;
    const value = control.value.toUpperCase().replace(/\s/g, '');
    
    if (!rfcRegex.test(value)) {
      return { rfc: { value: control.value } };
    }
    
    return null;
  }

  /**
   * Validator for Mexican CURP
   */
  static curp(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const curpRegex = /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[012])(0[1-9]|[12]\d|3[01])[HM](AS|B[CS]|C[CLMSH]|D[FG]|G[TR]|HG|JC|M[CNS]|N[ETL]|OC|PL|Q[TR]|S[PLR]|T[CSL]|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
    const value = control.value.toUpperCase().replace(/\s/g, '');
    
    if (!curpRegex.test(value)) {
      return { curp: { value: control.value } };
    }
    
    return null;
  }

  /**
   * Validator for terms between allowed values
   */
  static allowedTerms(allowedTerms: number[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const term = parseInt(control.value);
      
      if (!allowedTerms.includes(term)) {
        return { 
          allowedTerms: { 
            actual: term,
            allowed: allowedTerms,
            message: `Los plazos permitidos son: ${allowedTerms.join(', ')} meses`
          } 
        };
      }
      
      return null;
    };
  }

  /**
   * Validator for down payment percentage based on market and client type
   */
  static downPaymentPercentage(
    totalPriceControl: AbstractControl,
    market: 'aguascalientes' | 'edomex',
    clientType: 'Individual' | 'Colectivo'
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || !totalPriceControl.value) return null;
      
      const downPayment = parseFloat(control.value.toString().replace(/[\s$,]/g, ''));
      const totalPrice = parseFloat(totalPriceControl.value.toString().replace(/[\s$,]/g, ''));
      
      if (isNaN(downPayment) || isNaN(totalPrice) || totalPrice === 0) return null;
      
      const percentage = (downPayment / totalPrice) * 100;
      let minPercentage = 20; // Default 20%
      
      // Set minimum based on market and client type
      if (market === 'aguascalientes') {
        minPercentage = 20;
      } else if (market === 'edomex') {
        minPercentage = clientType === 'Colectivo' ? 15 : 25;
      }
      
      if (percentage < minPercentage) {
        return {
          downPaymentPercentage: {
            actual: percentage,
            required: minPercentage,
            market,
            clientType,
            message: `El enganche mínimo para ${clientType} en ${market === 'aguascalientes' ? 'Aguascalientes' : 'Estado de México'} es ${minPercentage}%`
          }
        };
      }
      
      return null;
    };
  }

  /**
   * Validator for plate numbers (Mexican format)
   */
  static mexicanPlate(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // Mexican plate formats: ABC-12-34 or ABC-123-4
    const plateRegex = /^[A-Z]{3}-\d{2,3}-[A-Z0-9]{1,2}$/;
    const value = control.value.toUpperCase().replace(/\s/g, '');
    
    if (!plateRegex.test(value)) {
      return { mexicanPlate: { value: control.value } };
    }
    
    return null;
  }

  /**
   * Cross-field validator for comparing two controls
   */
  static compareFields(controlName: string, matchingControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const control = formGroup.get(controlName);
      const matchingControl = formGroup.get(matchingControlName);
      
      if (!control || !matchingControl) return null;
      
      if (matchingControl.errors && !matchingControl.errors['compareFields']) {
        return null;
      }
      
      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ compareFields: true });
      } else {
        matchingControl.setErrors(null);
      }
      
      return null;
    };
  }

  /**
   * Validator for positive numbers
   */
  static positiveNumber(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = parseFloat(control.value);
    
    if (isNaN(value) || value <= 0) {
      return { positiveNumber: { value: control.value } };
    }
    
    return null;
  }

  /**
   * Validator for future dates
   */
  static futureDate(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const inputDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (inputDate <= today) {
      return { futureDate: { value: control.value } };
    }
    
    return null;
  }

  /**
   * Validator for date within range
   */
  static dateRange(minDate: Date, maxDate: Date): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const inputDate = new Date(control.value);
      
      if (inputDate < minDate || inputDate > maxDate) {
        return {
          dateRange: {
            actual: inputDate,
            min: minDate,
            max: maxDate,
            message: `La fecha debe estar entre ${minDate.toLocaleDateString('es-MX')} y ${maxDate.toLocaleDateString('es-MX')}`
          }
        };
      }
      
      return null;
    };
  }

  /**
   * Validator for client names (Mexican naming conventions)
   */
  static clientName(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const name = control.value.trim();
    
    // Must have at least 2 parts (first name and last name)
    const nameParts = name.split(/\s+/);
    
    if (nameParts.length < 2) {
      return {
        clientName: {
          value: control.value,
          message: 'Debe incluir al menos nombre y apellido paterno'
        }
      };
    }
    
    // Check for valid characters (letters, spaces, accents, hyphens)
    const validNameRegex = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-']+$/;
    
    if (!validNameRegex.test(name)) {
      return {
        clientName: {
          value: control.value,
          message: 'Solo se permiten letras, espacios, acentos y guiones'
        }
      };
    }
    
    return null;
  }
}