import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { tag, horimetroFinal, condicoes, observacoes, emailDestino } = req.body;
  const destinatario = (emailDestino && String(emailDestino).trim()) || 'jpsf016@gmail.com';

  try {
    const data = await resend.emails.send({
      from: 'Ge-Nio Mechaniq <onboarding@resend.dev>',
      to: [destinatario],
      subject: `[Desmobilização] Retorno ao Pátio - ${tag}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
          <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 8px; margin-top: 0;">
            📦 Notificação de Desmobilização de Equipamento
          </h2>
          <p>O seguinte equipamento foi desmobilizado e deu entrada no pátio:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="background: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Equipamento:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${tag}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Horímetro Final:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${horimetroFinal} h</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Condições de Retorno:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${condicoes}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Observações:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${observacoes || 'Nenhuma observação informada.'}</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            Enviado automaticamente pelo sistema <strong>Ge-Nio Mechaniq</strong>.
          </p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Erro Resend:', error);
    return res.status(500).json({ error: error.message || 'Falha ao enviar e-mail' });
  }
}
