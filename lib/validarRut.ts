/**
 * Validador de RUT Chileno
 *
 * Valida formato y dígito verificador según algoritmo oficial chileno
 */

/**
 * Limpia un RUT eliminando puntos, guiones y espacios
 */
export function limpiarRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/-/g, '').replace(/\s/g, '').toLowerCase().trim();
}

/**
 * Calcula el dígito verificador de un RUT usando algoritmo módulo 11
 * @param rut - RUT sin dígito verificador (solo números)
 * @returns Dígito verificador ('0'-'9' o 'k')
 */
export function calcularDigitoVerificador(rut: string): string {
  const rutLimpio = rut.replace(/[^0-9]/g, '');

  let suma = 0;
  let multiplicador = 2;

  // Recorrer de derecha a izquierda
  for (let i = rutLimpio.length - 1; i >= 0; i--) {
    suma += parseInt(rutLimpio[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = suma % 11;
  const dvCalculado = 11 - resto;

  if (dvCalculado === 11) return '0';
  if (dvCalculado === 10) return 'k';
  return dvCalculado.toString();
}

/**
 * Valida si un RUT chileno es válido
 * @param rut - RUT completo con o sin formato (ej: "12.345.678-9" o "12345678-9" o "123456789")
 * @returns true si el RUT es válido, false en caso contrario
 */
export function validarRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false;

  const rutLimpio = limpiarRut(rut);

  // Validar largo mínimo (RUTs chilenos tienen entre 7-9 dígitos + 1 DV)
  if (rutLimpio.length < 2) return false;

  // Extraer dígito verificador (último carácter)
  const dv = rutLimpio.slice(-1);
  const numero = rutLimpio.slice(0, -1);

  // Validar que el número sea solo dígitos
  if (!/^\d+$/.test(numero)) return false;

  // Validar que el dígito verificador sea válido (0-9 o k)
  if (!/^[0-9k]$/.test(dv)) return false;

  // Validar largo del número (sin DV): RUTs chilenos válidos tienen 6-9 dígitos
  if (numero.length < 6 || numero.length > 9) return false;

  // Calcular dígito verificador y comparar
  const dvCalculado = calcularDigitoVerificador(numero);
  return dv === dvCalculado;
}

/**
 * Formatea un RUT chileno al formato estándar XX.XXX.XXX-X
 * @param rut - RUT sin formato
 * @returns RUT formateado o el input original si es inválido
 */
export function formatearRut(rut: string): string {
  if (!validarRut(rut)) return rut;

  const rutLimpio = limpiarRut(rut);
  const dv = rutLimpio.slice(-1);
  const numero = rutLimpio.slice(0, -1);

  // Formatear con puntos
  const formateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formateado}-${dv.toUpperCase()}`;
}

/**
 * Valida y retorna mensaje de error si el RUT es inválido
 * @param rut - RUT a validar
 * @returns null si es válido, mensaje de error si es inválido
 */
export function validarRutConMensaje(rut: string): string | null {
  if (!rut || rut.trim() === '') {
    return 'El RUT es obligatorio';
  }

  const rutLimpio = limpiarRut(rut);

  if (rutLimpio.length < 2) {
    return 'El RUT es demasiado corto';
  }

  const dv = rutLimpio.slice(-1);
  const numero = rutLimpio.slice(0, -1);

  if (!/^\d+$/.test(numero)) {
    return 'El RUT solo debe contener números';
  }

  if (!/^[0-9k]$/.test(dv)) {
    return 'El dígito verificador debe ser 0-9 o K';
  }

  if (numero.length < 6) {
    return 'El RUT es demasiado corto (mínimo 6 dígitos)';
  }

  if (numero.length > 9) {
    return 'El RUT es demasiado largo (máximo 9 dígitos)';
  }

  const dvCalculado = calcularDigitoVerificador(numero);
  if (dv !== dvCalculado) {
    return `Dígito verificador inválido (debería ser ${dvCalculado.toUpperCase()})`;
  }

  return null; // RUT válido
}

/**
 * Ejemplos de uso:
 *
 * validarRut('12.345.678-5') // true
 * validarRut('12345678-5')   // true
 * validarRut('123456785')    // true
 * validarRut('12.345.678-9') // false (DV incorrecto)
 *
 * formatearRut('123456785')  // '12.345.678-5'
 *
 * validarRutConMensaje('12.345.678-9') // 'Dígito verificador inválido (debería ser 5)'
 */
