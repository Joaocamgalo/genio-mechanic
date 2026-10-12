import type { Chamado, Maquina } from '../types/controlmaq';

export function imprimirOuSalvarLaudoTecnico(chamado: Chamado, maquina?: Maquina | null) {
  const janela = window.open('', '_blank');
  if (!janela) {
    alert('Por favor, permita pop-ups para gerar o documento técnico da OS.');
    return;
  }

  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const conteudoHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Laudo Técnico - OS #${chamado.id} - ${chamado.maquina}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 30px; font-size: 13px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
        .titulo { font-size: 20px; font-weight: 900; margin: 0; color: #0f172a; }
        .subtitulo { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 600; }
        .badge { background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: 800; }
        .grid-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
        .box-title { font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 6px; }
        .box-val { font-size: 13px; font-weight: 700; color: #0f172a; }
        .secao { margin-bottom: 20px; }
        .secao-header { font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px; color: #1e293b; }
        .campo-texto { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; min-height: 50px; white-space: pre-wrap; font-size: 12px; }
        .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; text-align: center; }
        .linha-assinatura { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 12px; font-weight: 700; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 800; cursor: pointer;">
          🖨 Imprimir / Salvar em PDF
        </button>
      </div>

      <div class="header">
        <div>
          <div class="titulo">GE-NIO MECHANIQ</div>
          <div class="subtitulo">RELATÓRIO TÉCNICO DE MANUTENÇÃO & ENTREGA // OS #${chamado.id}</div>
        </div>
        <div>
          <span class="badge">${chamado.status.toUpperCase()}</span>
        </div>
      </div>

      <div class="grid-info">
        <div class="box">
          <div class="box-title">Equipamento / TAG</div>
          <div class="box-val">${chamado.maquina} ${maquina ? `(${maquina.marca}${maquina.modelo})` : ''}</div>
        </div>
        <div class="box">
          <div class="box-title">Cliente & Frente de Obra</div>
          <div class="box-val">${chamado.cliente || 'Interno / Oficina'} — ${chamado.local || 'Local não informado'}</div>
        </div>
        <div class="box">
          <div class="box-title">Técnico Responsável</div>
          <div class="box-val">${chamado.mecanico || 'Técnico de Campo'}</div>
        </div>
        <div class="box">
          <div class="box-title">Horímetro Registrado</div>
          <div class="box-val">${maquina?.horimetro ? `${maquina.horimetro} h` : 'Não registrado'}</div>
        </div>
      </div>

      <div class="secao">
        <div class="secao-header">1. Sintoma Inicial / Falha Relatada</div>
        <div class="campo-texto">${chamado.problema || 'Nenhuma descrição inicial cadastrada.'}</div>
      </div>

      <div class="secao">
        <div class="secao-header">2. Diagnóstico Técnico em Campo</div>
        <div class="campo-texto">${chamado.diagnostico_tecnico || 'Diagnóstico padrão executado conforme rotina de inspeção.'}</div>
      </div>

      <div class="secao">
        <div class="secao-header">3. Solução Efetuada & Consumíveis Aplicados</div>
        <div class="campo-texto">${chamado.solucao || 'Serviço concluído e equipamento liberado operacionalmente.'}</div>
      </div>

      <div style="font-size: 11px; color: #64748b; margin-top: 10px;">
        Documento gerado em: ${dataEmissao} via Ge-Nio Mechaniq Fleet Engine.
      </div>

      <div class="assinaturas">
        <div>
          <div class="linha-assinatura">Responsável Técnico / Mecânico</div>
          <small style="color: #64748b;">${chamado.mecanico || 'Assinatura Técnica'}</small>
        </div>
        <div>
          <div class="linha-assinatura">Operação / Recebedor do Equipamento</div>
          <small style="color: #64748b;">${chamado.solicitante || 'Assinatura Operacional'}</small>
        </div>
      </div>
    </body>
    </html>
  `;

  janela.document.write(conteudoHtml);
  janela.document.close();
}
