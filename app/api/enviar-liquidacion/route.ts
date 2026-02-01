// app/api/enviar-liquidacion/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createSupabaseServer } from "@/lib/supabase-server";

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Basic email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strip control characters and newlines to prevent header injection
function sanitize(input: string): string {
  return input.replace(/[\r\n\t\x00-\x1f]/g, '').trim().slice(0, 200);
}

export async function POST(request: Request) {
  try {
    // Auth check (middleware also blocks, this is defense-in-depth)
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const email = formData.get("email") as string | null;
    const nombre = formData.get("nombre") as string | null;
    const mes = formData.get("mes") as string | null;

    // Validate required fields
    if (!file || !email || !nombre || !mes) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Formato de email inválido" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo excede el tamaño máximo de 5MB" }, { status: 400 });
    }

    // Validate file type (only PDF)
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se permiten archivos PDF" }, { status: 400 });
    }

    // Sanitize text inputs to prevent header injection
    const safeNombre = sanitize(nombre);
    const safeMes = sanitize(mes);
    const safeEmail = email.trim();

    const buffer = Buffer.from(await file.arrayBuffer());

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Recursos Humanos" <${process.env.EMAIL_USER}>`,
      to: safeEmail,
      subject: `Liquidación de Sueldo - ${safeMes}`,
      text: `Esperando que se encuentre bien ${safeNombre},

    Adjunto enviamos su liquidación de sueldo correspondiente a ${safeMes}.

    Saludos cordiales,
    Recursos Humanos
    EDS 324
    Avda. Presidente Jorge Alessandri 26517, San Bernardo`,
      attachments: [
        {
          filename: `Liquidacion_${safeNombre.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9_\- ]/g, '')}.pdf`,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error enviando liquidación:", error);
    return NextResponse.json(
      { error: "Error al enviar el correo. Intente nuevamente." },
      { status: 500 }
    );
  }
}
