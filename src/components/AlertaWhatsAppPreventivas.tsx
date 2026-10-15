import React, { useState } from "react";
import { Send, Copy, AlertCircle, CheckCircle2 } from "lucide-react";

interface AlertaWhatsAppPreventivasProps {
  preventivas: any[];
  maquinas: any[];
}

export function AlertaWhatsAppPreventivas({ preventivas, maquinas }: AlertaWhatsAppPreventivasProps) {
  const [telefone, setTelefone] = useState("");
  const [copiado, setCopiado] = useState(false);

  const totalCriticas = preventivas ? preventivas.length : 0;

  const gerarTextoResumo = () => {
    const dataHoje = new Date().toLocaleDateString("pt-BR");
    let msg = "*GE-NIO MECHANIQ - ALERTA DE PREVENTIVAS CRÍTICAS (" + dataHoje + ")*\n";
    msg += "----------------------------------------\n";
    msg += "*Total de equipamentos em atenção:* " + totalCriticas + "\n\n";

    if (totalCriticas === 0) {
      msg += "✓ Nenhuma máquina com revisão vencida no momento.\n";
    } else {
      preventivas.forEach((p: any, idx: number) => {
        msg += (idx + 1) + ". *" + (p.maquina_tag || p.tag || "Máquina") + "* - " + (p.tipo || "Revisão") + "\n";
      });
    }

    msg += "----------------------------------------\n";
    msg += "*Ação necessária:* Programar envio de kits de filtros ou parada técnica imediata.\n";
    msg += "Painel Ge-Nio Mechaniq Fleet Operations";
    return msg;
  };

  const dispararWhatsApp = () => {
    const texto = gerarTextoResumo();
    const telLimpo = telefone.replace(/\D/g, "");
    const url = telLimpo 
      ? "https://api.whatsapp.com/send?phone=55" + telLimpo + "&text=" + encodeURIComponent(texto)
      : "https://api.whatsapp.com/send?text=" + encodeURIComponent(texto);
    window.open(url, "_blank");
  };

  const copiarResumo = () => {
    navigator.clipboard.writeText(gerarTextoResumo());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      padding: "16px 20px",
      marginBottom: "16px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: totalCriticas > 0 ? "#fef3c7" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {totalCriticas > 0 ? <AlertCircle size={18} color="#d97706" /> : <CheckCircle2 size={18} color="#16a34a" />}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
              Notificação de Preventivas da Frota
            </h4>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              {totalCriticas === 0 ? "Todas as revisões preventivas em dia" : totalCriticas + " equipamento(s) requerem atenção"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="text"
            placeholder="DDD + Telefone (opcional)"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              width: "180px"
            }}
          />
          <button
            type="button"
            onClick={copiarResumo}
            title="Copiar texto para área de transferência"
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Copy size={14} /> {copiado ? "Copiado!" : "Copiar"}
          </button>
          <button
            type="button"
            onClick={dispararWhatsApp}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: "#25D366",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Send size={14} /> Enviar via WhatsApp ({totalCriticas})
          </button>
        </div>
      </div>
    </div>
  );
}
