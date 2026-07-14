export const demoMetadataByLanguage = {
  en: {
    landingTitle: "See ServiceOS in Action | Interactive Public Demo",
    landingDescription:
      "Explore how one service business manages customers, estimates, employees, jobs, invoices, and payments-all from one platform.",
    landingOgTitle: "See ServiceOS in Action",
    landingOgDescription:
      "Public demo of the complete ServiceOS workflow: request, quote, schedule, complete, invoice, and pay.",
    adminTitle: "Business Owner Demo | ServiceOS",
    adminDescription:
      "Manage customers, estimates, schedules, employees, invoices, and business performance.",
    employeeTitle: "Employee Demo | ServiceOS",
    employeeDescription:
      "View assigned jobs, follow checklists, upload photos, and complete work in demo mode.",
    customerTitle: "Customer Demo | ServiceOS",
    customerDescription:
      "Approve estimates, follow job progress, and pay invoices in a safe, simulated checkout flow.",
    tourTitle: "Guided Demo Tour | ServiceOS",
    tourDescription:
      "Step through the 8-step ServiceOS workflow from first request to dashboard updates.",
  },
  es: {
    landingTitle: "Ve ServiceOS en Accion | Demo Publica Interactiva",
    landingDescription:
      "Explora como una empresa de servicios gestiona clientes, estimaciones, empleados, trabajos, facturas y pagos, todo desde una sola plataforma.",
    landingOgTitle: "Ve ServiceOS en Accion",
    landingOgDescription:
      "Demo publica del flujo completo de ServiceOS: solicitud, cotizacion, programacion, ejecucion, facturacion y pago.",
    adminTitle: "Demo para Propietario | ServiceOS",
    adminDescription:
      "Gestiona clientes, estimaciones, agendas, empleados, facturas y rendimiento del negocio.",
    employeeTitle: "Demo de Empleado | ServiceOS",
    employeeDescription:
      "Consulta trabajos asignados, sigue listas de verificacion, sube fotos y completa tareas en modo demo.",
    customerTitle: "Demo de Cliente | ServiceOS",
    customerDescription:
      "Aprueba estimaciones, sigue el progreso del trabajo y paga facturas en un flujo de pago simulado y seguro.",
    tourTitle: "Recorrido Guiado Demo | ServiceOS",
    tourDescription:
      "Recorre el flujo de 8 pasos de ServiceOS desde la primera solicitud hasta la actualizacion del panel.",
  },
} as const;

export type DemoMetadataLanguage = keyof typeof demoMetadataByLanguage;
