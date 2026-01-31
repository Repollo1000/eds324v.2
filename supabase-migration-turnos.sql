-- ============================================
-- Migration: Shift Generator (Turnos)
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Add columns to `personal` table
ALTER TABLE personal
  ADD COLUMN IF NOT EXISTS rol TEXT NOT NULL DEFAULT 'atendedor',
  ADD COLUMN IF NOT EXISTS grupo TEXT DEFAULT NULL;

-- Add check constraints
ALTER TABLE personal
  ADD CONSTRAINT personal_rol_check CHECK (rol IN ('atendedor', 'supervisor')),
  ADD CONSTRAINT personal_grupo_check CHECK (grupo IN ('A', 'B') OR grupo IS NULL);

-- 2. Create `turnos_generados` table
CREATE TABLE IF NOT EXISTS turnos_generados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('M', 'T', 'N', 'L')),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (personal_id, fecha)
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_turnos_generados_anio_mes
  ON turnos_generados (anio, mes);

CREATE INDEX IF NOT EXISTS idx_turnos_generados_personal_anio_mes
  ON turnos_generados (personal_id, anio, mes);

-- Enable RLS (Row Level Security) - adjust policies as needed
ALTER TABLE turnos_generados ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (adjust for your auth setup)
CREATE POLICY "Allow all for authenticated users" ON turnos_generados
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
