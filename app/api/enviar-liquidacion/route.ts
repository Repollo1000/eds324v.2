// app/api/enviar-liquidacion/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;
    const email = formData.get("email") as string;
    const nombre = formData.get("nombre") as string;
    const mes = formData.get("mes") as string;

    if (!file || !email) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // CONFIGURA AQUÍ TU CORREO REAL
    const transporter = nodemailer.createTransport({
      service: "gmail", // O tu proveedor SMTP
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });

    await transporter.sendMail({
      from: '"Recursos Humanos" <tu_email@empresa.com>',
      to: email,
      subject: `Liquidación de Sueldo - ${mes}`,
      text: `Hola ${nombre}, adjunto enviamos tu liquidación de sueldo correspondiente a ${mes}.`,
      attachments: [
        {
          filename: `Liquidacion_${nombre}.pdf`,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}