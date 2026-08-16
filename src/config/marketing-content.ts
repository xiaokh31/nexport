import type { Locale } from "@/i18n";
import type { SolutionKey } from "@/config/site-config";

type LocalizedText = Record<Locale, string>;

const localized = (zh: string, en: string, fr: string): LocalizedText => ({
  zh,
  en,
  fr,
});

export interface OperationStage {
  code: string;
  title: string;
  customer: string;
  operation: string;
  outcome: string;
}

export interface SolutionUiContent {
  title: string;
  summary: string;
  capabilities: string[];
  exclusion: string;
}

export interface SolutionPurposeGroup {
  key: "fulfillment" | "fba" | "transport";
  marker: string;
  title: string;
  description: string;
  solutionKeys: readonly SolutionKey[];
  suitedFor: string[];
  process: Array<{ title: string; description: string }>;
  requiredInfo: string[];
}

interface LocalizedSolutionProfile {
  title: LocalizedText;
  summary: LocalizedText;
  capabilities: readonly [LocalizedText, LocalizedText, LocalizedText];
  exclusion: LocalizedText;
}

const solutionProfiles = {
  warehouse: {
    title: localized(
      "海外仓储与履约",
      "Warehousing & Fulfillment",
      "Entreposage et exécution",
    ),
    summary: localized(
      "围绕入库接收、存储组织、拣配和出库准备的仓储履约服务；这是作业服务，不是 WMS 软件销售。",
      "Warehousing operations covering inbound receiving, storage organization, picking, and outbound preparation. This is an operating service, not WMS software sales.",
      "Opérations d’entreposage couvrant la réception, l’organisation du stockage, la préparation et la sortie. Il s’agit d’un service opérationnel, pas de la vente d’un logiciel WMS.",
    ),
    capabilities: [
      localized("到货资料与货物核对", "Arrival and cargo checks", "Vérification des arrivages et marchandises"),
      localized("上架与存储组织", "Put-away and storage organization", "Mise en stock et organisation"),
      localized("拣配与出库准备", "Pick, pack, and outbound preparation", "Préparation et sortie des commandes"),
    ],
    exclusion: localized(
      "不包含 WMS 软件销售；库存同步、平台对接或特定操作时限需在询价中单独确认。",
      "WMS software is not included. Inventory sync, platform integrations, and handling timelines require separate confirmation.",
      "Le logiciel WMS n’est pas inclus. La synchronisation des stocks, les intégrations et les délais doivent être confirmés séparément.",
    ),
  },
  dropshipping: {
    title: localized("一件代发", "Dropshipping Fulfillment", "Exécution en dropshipping"),
    summary: localized(
      "根据订单资料进行单件拣货、包装和出库交接，适合需要由仓储环节完成逐单履约的需求。",
      "Item-level picking, packing, and outbound handoff based on order information for businesses that need per-order fulfillment.",
      "Prélèvement à l’unité, emballage et remise au transport selon les commandes, pour les besoins d’exécution commande par commande.",
    ),
    capabilities: [
      localized("订单与 SKU 资料接收", "Order and SKU data intake", "Réception des données de commande et SKU"),
      localized("单件拣货与包装", "Item picking and packing", "Prélèvement et emballage à l’unité"),
      localized("出库与运输交接", "Outbound and carrier handoff", "Sortie et remise au transport"),
    ],
    exclusion: localized(
      "不默认包含商品采购、店铺运营或消费者售后；包装材料和运输环节需按需求确认。",
      "Product sourcing, storefront operations, and consumer support are not included by default. Packaging and transportation must be confirmed.",
      "L’approvisionnement, la gestion de boutique et le service consommateur ne sont pas inclus par défaut. L’emballage et le transport doivent être confirmés.",
    ),
  },
  returns: {
    title: localized("退货接收与换标", "Returns & Relabeling", "Retours et réétiquetage"),
    summary: localized(
      "接收退回货物，按约定核对状态、标签与后续处理要求，并把处理结果交回下一业务环节。",
      "Receive returned goods, check condition and labels against agreed instructions, and hand the result to the next business step.",
      "Réceptionner les retours, vérifier l’état et les étiquettes selon les consignes, puis transmettre le résultat à l’étape suivante.",
    ),
    capabilities: [
      localized("退货接收与信息核对", "Return receiving and data checks", "Réception et vérification des retours"),
      localized("状态检查与换标准备", "Condition checks and relabel preparation", "Contrôle d’état et préparation au réétiquetage"),
      localized("处理结果分类与交接", "Result sorting and handoff", "Tri des résultats et transmission"),
    ],
    exclusion: localized(
      "销毁、翻新或再次销售均需单独授权和确认，不会作为默认处理方式。",
      "Disposal, refurbishment, and resale each require separate authorization and are never assumed.",
      "La destruction, la remise à neuf et la revente nécessitent une autorisation distincte et ne sont jamais présumées.",
    ),
  },
  amazonFba: {
    title: localized("FBA 入仓前准备", "FBA Preparation", "Préparation FBA"),
    summary: localized(
      "在送往 FBA 履约中心前，按客户提供的入仓要求核对标签、包装、组套和货件资料。",
      "Check labels, packaging, kitting, and shipment information against customer-provided FBA requirements before delivery.",
      "Vérifier les étiquettes, l’emballage, les lots et les données d’expédition selon les exigences FBA fournies avant la livraison.",
    ),
    capabilities: [
      localized("标签与包装要求核对", "Label and packaging checks", "Vérification des étiquettes et emballages"),
      localized("组套与前置处理", "Kitting and prep work", "Mise en lot et préparation"),
      localized("入仓货件资料准备", "Inbound shipment preparation", "Préparation des données d’expédition"),
    ],
    exclusion: localized(
      "本服务不等同于 FBA 预约或尾程交付；需要送仓时应同时选择对应尾程服务。",
      "This service is separate from FBA appointments and last-mile delivery. Select the delivery service when warehouse handoff is needed.",
      "Ce service est distinct des rendez-vous FBA et de la livraison finale. Sélectionnez le service de livraison si une remise à l’entrepôt est requise.",
    ),
  },
  fbaLastMile: {
    title: localized("FBA 预约与尾程交付", "FBA Appointment & Last Mile", "Rendez-vous FBA et dernier kilomètre"),
    summary: localized(
      "围绕提货或货物交接、预约信息协同和送仓交接组织 FBA 尾程需求。",
      "Coordinate pickup or cargo handoff, appointment information, and final warehouse delivery for FBA-bound shipments.",
      "Coordonner l’enlèvement ou la remise, les informations de rendez-vous et la livraison finale des envois destinés à FBA.",
    ),
    capabilities: [
      localized("提货或货物交接安排", "Pickup or cargo handoff planning", "Planification de l’enlèvement ou de la remise"),
      localized("预约资料与窗口协同", "Appointment data coordination", "Coordination des données de rendez-vous"),
      localized("尾程送仓交接", "Last-mile warehouse handoff", "Remise finale à l’entrepôt"),
    ],
    exclusion: localized(
      "不默认包含贴标、组套、清关或入仓前整改；这些工作需按实际需求分别确认。",
      "Labeling, kitting, customs work, and corrective prep are not included by default and must be confirmed separately.",
      "L’étiquetage, la mise en lot, la douane et les corrections ne sont pas inclus par défaut et doivent être confirmés séparément.",
    ),
  },
  truckFreight: {
    title: localized("卡车运输衔接", "Truck Freight Coordination", "Coordination du transport routier"),
    summary: localized(
      "根据货物、线路、装卸和交付条件，梳理零担或整车运输需求并组织运输交接。",
      "Structure LTL or FTL requirements around cargo, lane, loading, and delivery conditions, then coordinate the handoff.",
      "Structurer les besoins LTL ou FTL selon la marchandise, l’itinéraire, le chargement et la livraison, puis coordonner la remise.",
    ),
    capabilities: [
      localized("货物与线路资料核对", "Cargo and lane data checks", "Vérification de la marchandise et de l’itinéraire"),
      localized("零担或整车需求匹配", "LTL or FTL requirement matching", "Adaptation des besoins LTL ou FTL"),
      localized("提货与交付条件衔接", "Pickup and delivery coordination", "Coordination de l’enlèvement et de la livraison"),
    ],
    exclusion: localized(
      "实际承运能力、线路、价格和时效以询价确认结果为准，页面不作固定承诺。",
      "Carrier capacity, lanes, pricing, and transit times are confirmed through the quote and are not fixed promises on this page.",
      "La capacité, les itinéraires, les tarifs et les délais sont confirmés par le devis et ne constituent pas des promesses fixes.",
    ),
  },
  crossBorder: {
    title: localized("跨境运输协同", "Cross-Border Coordination", "Coordination transfrontalière"),
    summary: localized(
      "梳理跨境运输线路、货物资料、单证责任和转运节点，明确各方在运输过程中的交接边界。",
      "Map the cross-border lane, cargo information, document responsibilities, and transfer points so each handoff is explicit.",
      "Définir l’itinéraire transfrontalier, les données de marchandise, les responsabilités documentaires et les points de transfert.",
    ),
    capabilities: [
      localized("跨境线路需求梳理", "Cross-border lane scoping", "Définition de l’itinéraire transfrontalier"),
      localized("单证与责任边界确认", "Document and responsibility checks", "Vérification des documents et responsabilités"),
      localized("干线与转运节点衔接", "Linehaul and transfer coordination", "Coordination de la ligne et des transferts"),
    ],
    exclusion: localized(
      "清关主体、税费、许可和具体线路需根据货物与交易条件确认，不在页面中预设。",
      "Customs parties, duties, permits, and exact lanes depend on the cargo and trade terms and are not assumed here.",
      "Les parties douanières, droits, permis et itinéraires exacts dépendent de la marchandise et des conditions commerciales.",
    ),
  },
  express: {
    title: localized("快递与加急寄递", "Express & Expedited Shipping", "Messagerie express et accélérée"),
    summary: localized(
      "面向文件或包裹的寄递需求，先确认方向、货物限制、期望时间与取派条件，再匹配可行方式。",
      "For documents or parcels, first confirm direction, cargo restrictions, requested timing, and pickup or delivery conditions.",
      "Pour les documents ou colis, confirmer d’abord la direction, les restrictions, le délai souhaité et les conditions d’enlèvement ou de livraison.",
    ),
    capabilities: [
      localized("文件或包裹资料核对", "Document or parcel data checks", "Vérification des documents ou colis"),
      localized("期望时效与限制说明", "Timing and restriction review", "Examen du délai et des restrictions"),
      localized("取件与末端条件确认", "Pickup and final-delivery checks", "Vérification de l’enlèvement et de la livraison"),
    ],
    exclusion: localized(
      "寄递方向、服务商、清关责任和实际时效均需在询价后确认，不在页面中固定描述。",
      "Direction, provider, customs responsibility, and transit time are confirmed after inquiry and are not fixed here.",
      "La direction, le prestataire, la responsabilité douanière et le délai sont confirmés après la demande et ne sont pas fixés ici.",
    ),
  },
} satisfies Record<SolutionKey, LocalizedSolutionProfile>;

const purposeProfiles = [
  {
    key: "fulfillment",
    marker: "STORE / FULFILL",
    title: localized("仓储履约", "Warehousing fulfillment", "Exécution en entrepôt"),
    description: localized(
      "从到货接收到逐单出库，并处理退回货物。",
      "From inbound receiving to per-order dispatch and returned-goods handling.",
      "De la réception à l’expédition par commande et au traitement des retours.",
    ),
    solutionKeys: ["warehouse", "dropshipping", "returns"] as const,
    suitedFor: [
      localized("需要仓储与订单履约的品牌方", "Brands needing storage and order fulfillment", "Marques ayant besoin de stockage et d’exécution"),
      localized("需要逐单拣配出库的平台卖家", "Marketplace sellers needing per-order dispatch", "Vendeurs de place de marché nécessitant une expédition par commande"),
      localized("需要退货接收与后续处理的团队", "Teams needing return intake and onward handling", "Équipes ayant besoin de réception et traitement des retours"),
    ],
    process: [
      localized("确认货物与到货资料", "Confirm cargo and arrival data", "Confirmer la marchandise et l’arrivée"),
      localized("接收并组织存储", "Receive and organize storage", "Réceptionner et organiser le stockage"),
      localized("按指令拣配或处理", "Pick, pack, or handle to instruction", "Préparer ou traiter selon les consignes"),
      localized("完成出库或结果交接", "Complete outbound or result handoff", "Finaliser la sortie ou la remise du résultat"),
    ],
    processDescriptions: [
      localized("核对到货条件，明确接收后的存储或处理安排。", "Check arrival conditions and define storage or handling after receipt.", "Vérifier les conditions d’arrivée et définir le stockage ou traitement après réception."),
      localized("按 SKU、包装和存储要求组织货物。", "Organize cargo against SKU, packaging, and storage requirements.", "Organiser la marchandise selon les exigences SKU, d’emballage et de stockage."),
      localized("依据订单、标签或退货指令完成约定作业。", "Complete agreed work against order, label, or return instructions.", "Effectuer le travail convenu selon les commandes, étiquettes ou retours."),
      localized("准备出库，并把货物或处理结果交给下一环节。", "Prepare outbound cargo and hand goods or results to the next step.", "Préparer la sortie et remettre la marchandise ou le résultat à l’étape suivante."),
    ],
    requiredInfo: [
      localized("SKU、品类与包装方式", "SKU, product type, and packaging", "SKU, type de produit et emballage"),
      localized("箱数、件数或托盘数", "Carton, unit, or pallet counts", "Nombre de cartons, unités ou palettes"),
      localized("到货方式与期望时间", "Arrival method and requested timing", "Mode d’arrivée et délai souhaité"),
      localized("所需拣配、换标或退货指令", "Picking, relabeling, or return instructions", "Consignes de préparation, réétiquetage ou retour"),
    ],
  },
  {
    key: "fba",
    marker: "PREP / DELIVER",
    title: localized("FBA 准备与交付", "FBA preparation & delivery", "Préparation et livraison FBA"),
    description: localized(
      "区分入仓前处理与预约送仓，按实际需求组合。",
      "Separate prep work from appointment delivery and combine only what is needed.",
      "Distinguer la préparation de la livraison sur rendez-vous et combiner selon le besoin.",
    ),
    solutionKeys: ["amazonFba", "fbaLastMile"] as const,
    suitedFor: [
      localized("需要按入仓要求整理货件的平台卖家", "Sellers preparing shipments to inbound requirements", "Vendeurs préparant des envois selon les exigences d’entrée"),
      localized("需要贴标、包装或组套前置处理的团队", "Teams needing labels, packaging, or kitting", "Équipes ayant besoin d’étiquetage, d’emballage ou de lots"),
      localized("需要预约与尾程送仓衔接的货件", "Shipments needing appointment and last-mile coordination", "Envois nécessitant rendez-vous et coordination finale"),
    ],
    process: [
      localized("核对货件与入仓要求", "Review shipment and inbound requirements", "Vérifier l’envoi et les exigences d’entrée"),
      localized("完成约定的前置处理", "Complete agreed prep work", "Effectuer la préparation convenue"),
      localized("准备预约与交接资料", "Prepare appointment and handoff data", "Préparer le rendez-vous et la remise"),
      localized("完成送仓或结果交接", "Complete delivery or result handoff", "Finaliser la livraison ou la remise"),
    ],
    processDescriptions: [
      localized("依据客户提供的入仓要求确认货件资料和工作边界。", "Confirm shipment data and work boundaries against customer-provided inbound requirements.", "Confirmer les données et le périmètre selon les exigences d’entrée fournies."),
      localized("执行已确认的贴标、包装、组套或其他前置工作。", "Complete confirmed labeling, packaging, kitting, or other preparation.", "Effectuer l’étiquetage, l’emballage, la mise en lot ou autre préparation confirmée."),
      localized("需要送仓时，整理预约窗口与交接所需资料。", "When delivery is needed, prepare appointment and handoff information.", "Si une livraison est requise, préparer les informations de rendez-vous et de remise."),
      localized("完成送仓交接，或把前置处理结果移交下一环节。", "Complete warehouse delivery or hand prep results to the next step.", "Finaliser la livraison ou transmettre le résultat de préparation à l’étape suivante."),
    ],
    requiredInfo: [
      localized("货件编号与目的仓信息", "Shipment ID and destination information", "Identifiant d’envoi et destination"),
      localized("标签、包装与组套要求", "Label, packaging, and kitting requirements", "Exigences d’étiquetage, emballage et mise en lot"),
      localized("箱数、尺寸与重量", "Carton count, dimensions, and weight", "Nombre de cartons, dimensions et poids"),
      localized("预约窗口或期望交付时间", "Appointment window or requested delivery time", "Fenêtre de rendez-vous ou délai souhaité"),
    ],
  },
  {
    key: "transport",
    marker: "MOVE / HANDOFF",
    title: localized("运输衔接", "Transportation coordination", "Coordination du transport"),
    description: localized(
      "按货物、线路和交付条件梳理卡车、跨境或快递需求。",
      "Structure truck, cross-border, or express needs around cargo, lane, and delivery conditions.",
      "Structurer les besoins routiers, transfrontaliers ou express selon la marchandise, l’itinéraire et la livraison.",
    ),
    solutionKeys: ["truckFreight", "crossBorder", "express"] as const,
    suitedFor: [
      localized("需要零担或整车运输衔接的货物", "Cargo needing LTL or FTL coordination", "Marchandises nécessitant une coordination LTL ou FTL"),
      localized("需要明确跨境单证与交接责任的团队", "Teams defining cross-border documents and handoffs", "Équipes définissant les documents et remises transfrontalières"),
      localized("需要文件或包裹寄递方案的客户", "Customers planning document or parcel shipping", "Clients planifiant l’envoi de documents ou colis"),
    ],
    process: [
      localized("确认货物、起点与目的地", "Confirm cargo, origin, and destination", "Confirmer la marchandise, l’origine et la destination"),
      localized("核对装卸、单证与限制", "Review loading, documents, and restrictions", "Vérifier chargement, documents et restrictions"),
      localized("确认可行运输与交接方式", "Confirm a feasible transport and handoff plan", "Confirmer un plan de transport et de remise"),
      localized("执行提货与目的端交接", "Coordinate pickup and destination handoff", "Coordonner l’enlèvement et la remise à destination"),
    ],
    processDescriptions: [
      localized("用起点、目的地、货物和期望时间界定运输需求。", "Define the transport need with origin, destination, cargo, and requested timing.", "Définir le besoin avec l’origine, la destination, la marchandise et le délai souhaité."),
      localized("确认尺寸重量、装卸、单证、预约和货物限制。", "Confirm dimensions, weight, loading, documents, appointments, and cargo restrictions.", "Confirmer dimensions, poids, chargement, documents, rendez-vous et restrictions."),
      localized("根据已确认条件确定可行的运输与节点交接方式。", "Determine a feasible transport and node-handoff plan from confirmed conditions.", "Déterminer un plan de transport et de remise réalisable selon les conditions confirmées."),
      localized("按确认的计划衔接提货、运输和目的端交接。", "Coordinate pickup, transport, and destination handoff to the confirmed plan.", "Coordonner l’enlèvement, le transport et la remise selon le plan confirmé."),
    ],
    requiredInfo: [
      localized("起运地、目的地与期望时间", "Origin, destination, and requested timing", "Origine, destination et délai souhaité"),
      localized("货物类型、数量与包装", "Cargo type, quantity, and packaging", "Type, quantité et emballage de la marchandise"),
      localized("重量、尺寸与装卸条件", "Weight, dimensions, and loading conditions", "Poids, dimensions et conditions de chargement"),
      localized("跨境单证或预约要求", "Cross-border documents or appointment needs", "Documents transfrontaliers ou besoins de rendez-vous"),
    ],
  },
] as const;

const copyByLocale = {
  zh: {
    hero: {
      eyebrow: "履约路径",
      title: "海外仓储、订单履约与运输衔接",
      description: "面向跨境电商卖家、品牌方和物流伙伴，梳理从入库接收到出库交接的服务路径。提交货物、线路与期望时间，获取匹配方案。",
      primaryAction: "提交询价",
      secondaryAction: "查看解决方案",
      visualLabel: "从入库到交接",
    },
    process: {
      eyebrow: "真实作业顺序",
      title: "每一步都对应客户资料、作业动作与交接结果",
      description: "流程只描述本项目确认的通用履约环节；具体地点、时效、容量和服务水平以询价结果为准。",
      customerLabel: "客户准备",
      operationLabel: "作业环节",
      outcomeLabel: "交接结果",
      stages: [
        { code: "01 / RECEIVE", title: "入库接收", customer: "到货时间、箱数与货物信息", operation: "确认接收条件并核对到货", outcome: "进入存储或后续处理环节" },
        { code: "02 / STORE", title: "上架存储", customer: "SKU、包装与存储要求", operation: "组织上架、存储与货物标识", outcome: "为订单或后续作业做好准备" },
        { code: "03 / PROCESS", title: "拣配与增值处理", customer: "订单、标签或退货指令", operation: "执行拣货、包装、换标等约定工作", outcome: "货物达到出库或下一处理条件" },
        { code: "04 / HANDOFF", title: "出库交接", customer: "目的地、预约与期望时间", operation: "准备出库并协调运输交接", outcome: "完成提货或目的端交接" },
      ],
    },
    solutions: {
      eyebrow: "按业务目的选择",
      title: "先确定要完成的作业，再选择服务",
      description: "八项服务按仓储履约、FBA 准备与交付、运输衔接分组，避免让不同环节看起来彼此等同。",
      detailAction: "查看服务边界",
      quoteAction: "按此服务询价",
      allAction: "查看全部解决方案",
    },
    capabilities: {
      eyebrow: "服务边界",
      title: "把服务范围落在可确认的作业内容上",
      description: "从货物资料、处理要求到运输交接逐项确认，让询价围绕实际工作展开。",
      items: [
        "入库、SKU、箱数和包装资料核对",
        "存储、拣配、包装与出库需求梳理",
        "标签、组套、退货等增值处理边界确认",
        "运输线路、单证、预约与交接条件确认",
      ],
    },
    audience: {
      eyebrow: "适用合作方式",
      title: "围绕你的履约角色组织需求",
      items: [
        { title: "品牌方", description: "把入库、存储、逐单履约和退货处理整理成一条可询价的作业链。" },
        { title: "平台卖家", description: "区分 FBA 入仓前准备与预约送仓，按货件实际情况选择。" },
        { title: "物流伙伴", description: "明确运输节点、单证责任和仓库交接条件，减少信息断点。" },
      ],
    },
    cta: {
      eyebrow: "询价准备",
      title: "准备好关键信息，再开始询价",
      description: "资料越完整，越容易确认服务范围与下一步。",
      items: ["服务类型与货物说明", "起运地、目的地与期望时间", "件数、箱数或托盘数", "重量、尺寸与特殊处理要求"],
      action: "开始填写询价",
    },
    solutionIndex: {
      eyebrow: "解决方案目录",
      title: "按实际作业目的找到对应入口",
      description: "每项服务都列出适用场景、三项核心工作和明确边界，可直接进入详情或预选询价。",
    },
    detail: {
      back: "全部解决方案",
      suitedFor: "适用对象与典型需求",
      scope: "服务范围",
      included: "本服务可讨论",
      excluded: "不默认包含",
      process: "作业流程",
      required: "询价前需准备",
      faq: "常见问题",
      related: "同组解决方案",
      quote: "按此服务提交询价",
      faqItems: [
        { question: "页面中的服务范围可以调整吗？", answer: "可以。页面列出的是通用边界；提交货物、处理、线路和时间要求后，询价结果会确认实际包含的工作。" },
        { question: "为什么页面不写固定价格或时效？", answer: "价格、时效和可执行范围取决于货物、数量、线路、预约与处理要求，需要在资料完整后确认。" },
      ],
    },
    articles: {
      homeTitle: "最新行业内容",
      homeDescription: "查看已发布的服务公告、行业信息和政策内容。",
      relatedTitle: "相关文章",
    },
  },
  en: {
    hero: {
      eyebrow: "Fulfillment path",
      title: "Warehousing, order fulfillment, and transportation handoffs",
      description: "For e-commerce sellers, brands, and logistics partners: map the path from inbound receiving to outbound handoff. Share cargo, lane, and requested timing to start a matched quote.",
      primaryAction: "Start a quote",
      secondaryAction: "View solutions",
      visualLabel: "Inbound to handoff",
    },
    process: {
      eyebrow: "Real operating sequence",
      title: "Every step connects customer inputs, handling work, and a handoff result",
      description: "This path describes confirmed fulfillment stages only. Location, timing, capacity, and service levels are confirmed through the quote.",
      customerLabel: "You prepare",
      operationLabel: "Handling step",
      outcomeLabel: "Handoff result",
      stages: [
        { code: "01 / RECEIVE", title: "Inbound receiving", customer: "Arrival time, carton count, and cargo data", operation: "Confirm receiving conditions and check arrival", outcome: "Move into storage or the next handling step" },
        { code: "02 / STORE", title: "Put-away and storage", customer: "SKU, packaging, and storage requirements", operation: "Organize put-away, storage, and identification", outcome: "Prepare cargo for orders or further work" },
        { code: "03 / PROCESS", title: "Pick, pack, and value-add", customer: "Orders, labels, or return instructions", operation: "Complete agreed picking, packing, or relabeling", outcome: "Reach outbound or next-step condition" },
        { code: "04 / HANDOFF", title: "Outbound handoff", customer: "Destination, appointment, and requested timing", operation: "Prepare outbound cargo and coordinate transport", outcome: "Complete pickup or destination handoff" },
      ],
    },
    solutions: {
      eyebrow: "Choose by business purpose",
      title: "Start with the job to be completed, then select a service",
      description: "Eight services are grouped into warehousing fulfillment, FBA preparation and delivery, and transportation coordination.",
      detailAction: "View service boundary",
      quoteAction: "Quote this service",
      allAction: "View all solutions",
    },
    capabilities: {
      eyebrow: "Service boundaries",
      title: "Ground the service scope in confirmable operating work",
      description: "Confirm cargo data, handling requirements, and transport handoffs so the quote is structured around the actual job.",
      items: [
        "Inbound, SKU, carton, and packaging data checks",
        "Storage, picking, packing, and outbound scoping",
        "Labeling, kitting, returns, and value-add boundaries",
        "Lane, document, appointment, and handoff checks",
      ],
    },
    audience: {
      eyebrow: "Ways to work together",
      title: "Organize requirements around your fulfillment role",
      items: [
        { title: "Brands", description: "Turn inbound, storage, per-order fulfillment, and returns into one quote-ready operating path." },
        { title: "Marketplace sellers", description: "Separate FBA preparation from appointment delivery and choose against the actual shipment." },
        { title: "Logistics partners", description: "Define transport nodes, document ownership, and warehouse handoffs to reduce information gaps." },
      ],
    },
    cta: {
      eyebrow: "Quote readiness",
      title: "Prepare the key inputs before starting your quote",
      description: "More complete inputs make the service boundary and next step easier to confirm.",
      items: ["Service type and cargo description", "Origin, destination, and requested timing", "Unit, carton, or pallet count", "Weight, dimensions, and special handling"],
      action: "Start the quote form",
    },
    solutionIndex: {
      eyebrow: "Solution directory",
      title: "Find the right entry by operating purpose",
      description: "Each service lists suitable scenarios, three core tasks, and an explicit boundary, with direct detail and preselected quote links.",
    },
    detail: {
      back: "All solutions",
      suitedFor: "Suitable needs",
      scope: "Service scope",
      included: "In scope for discussion",
      excluded: "Not included by default",
      process: "Operating process",
      required: "Prepare before requesting a quote",
      faq: "Common questions",
      related: "Solutions in this group",
      quote: "Request a quote for this service",
      faqItems: [
        { question: "Can the service scope be adjusted?", answer: "Yes. The page gives a general boundary. The quote confirms actual work after you share cargo, handling, lane, and timing requirements." },
        { question: "Why are fixed prices or transit times not shown?", answer: "Pricing, timing, and feasibility depend on cargo, quantity, lane, appointments, and handling requirements and need complete inputs." },
      ],
    },
    articles: {
      homeTitle: "Latest industry content",
      homeDescription: "Read published service notices, industry information, and policy content.",
      relatedTitle: "Related articles",
    },
  },
  fr: {
    hero: {
      eyebrow: "Parcours d’exécution",
      title: "Entreposage, exécution des commandes et relais de transport",
      description: "Pour vendeurs e-commerce, marques et partenaires logistiques : définir le parcours de la réception à la remise sortante. Partagez marchandise, itinéraire et délai souhaité pour démarrer un devis adapté.",
      primaryAction: "Demander un devis",
      secondaryAction: "Voir les solutions",
      visualLabel: "Réception à remise",
    },
    process: {
      eyebrow: "Séquence opérationnelle réelle",
      title: "Chaque étape relie les données client, le travail effectué et un résultat de remise",
      description: "Ce parcours décrit uniquement les étapes confirmées. Le lieu, le délai, la capacité et le niveau de service sont confirmés par le devis.",
      customerLabel: "À préparer",
      operationLabel: "Étape de traitement",
      outcomeLabel: "Résultat de remise",
      stages: [
        { code: "01 / RECEIVE", title: "Réception entrante", customer: "Heure d’arrivée, cartons et données marchandise", operation: "Confirmer les conditions et vérifier l’arrivée", outcome: "Passer au stockage ou au traitement suivant" },
        { code: "02 / STORE", title: "Mise en stock", customer: "SKU, emballage et exigences de stockage", operation: "Organiser le rangement, le stockage et l’identification", outcome: "Préparer la marchandise pour les commandes" },
        { code: "03 / PROCESS", title: "Préparation et valeur ajoutée", customer: "Commandes, étiquettes ou consignes de retour", operation: "Effectuer préparation, emballage ou réétiquetage convenu", outcome: "Atteindre l’état requis pour la sortie" },
        { code: "04 / HANDOFF", title: "Remise sortante", customer: "Destination, rendez-vous et délai souhaité", operation: "Préparer la sortie et coordonner le transport", outcome: "Finaliser l’enlèvement ou la remise à destination" },
      ],
    },
    solutions: {
      eyebrow: "Choisir par objectif",
      title: "Commencez par le travail à accomplir, puis choisissez le service",
      description: "Huit services sont regroupés entre exécution en entrepôt, préparation et livraison FBA, et coordination du transport.",
      detailAction: "Voir la limite du service",
      quoteAction: "Devis pour ce service",
      allAction: "Voir toutes les solutions",
    },
    capabilities: {
      eyebrow: "Limites du service",
      title: "Ancrer le périmètre dans un travail opérationnel vérifiable",
      description: "Confirmer les données, le traitement et les remises de transport afin que le devis reflète le travail réel.",
      items: [
        "Vérification des arrivages, SKU, cartons et emballages",
        "Définition du stockage, de la préparation et de la sortie",
        "Limites pour étiquetage, lots, retours et valeur ajoutée",
        "Vérification de l’itinéraire, des documents et des remises",
      ],
    },
    audience: {
      eyebrow: "Modes de collaboration",
      title: "Organiser les besoins selon votre rôle d’exécution",
      items: [
        { title: "Marques", description: "Transformer réception, stockage, exécution par commande et retours en un parcours prêt pour devis." },
        { title: "Vendeurs de plateformes", description: "Distinguer la préparation FBA de la livraison sur rendez-vous selon l’envoi réel." },
        { title: "Partenaires logistiques", description: "Définir les nœuds, les documents et les remises d’entrepôt pour réduire les ruptures d’information." },
      ],
    },
    cta: {
      eyebrow: "Préparer le devis",
      title: "Préparez les informations clés avant de commencer",
      description: "Des informations complètes facilitent la confirmation du périmètre et de l’étape suivante.",
      items: ["Type de service et description de la marchandise", "Origine, destination et délai souhaité", "Nombre d’unités, cartons ou palettes", "Poids, dimensions et manutention spéciale"],
      action: "Commencer le formulaire",
    },
    solutionIndex: {
      eyebrow: "Répertoire des solutions",
      title: "Trouver l’entrée adaptée à l’objectif opérationnel",
      description: "Chaque service présente les besoins adaptés, trois tâches principales et une limite explicite, avec accès direct au détail et au devis présélectionné.",
    },
    detail: {
      back: "Toutes les solutions",
      suitedFor: "Besoins adaptés",
      scope: "Périmètre du service",
      included: "À définir dans le périmètre",
      excluded: "Non inclus par défaut",
      process: "Processus opérationnel",
      required: "À préparer avant le devis",
      faq: "Questions fréquentes",
      related: "Solutions du même groupe",
      quote: "Demander un devis pour ce service",
      faqItems: [
        { question: "Le périmètre du service peut-il être ajusté ?", answer: "Oui. La page donne une limite générale. Le devis confirme le travail réel après réception des exigences de marchandise, traitement, itinéraire et délai." },
        { question: "Pourquoi aucun prix ou délai fixe n’est-il affiché ?", answer: "Le prix, le délai et la faisabilité dépendent de la marchandise, de la quantité, de l’itinéraire, des rendez-vous et du traitement." },
      ],
    },
    articles: {
      homeTitle: "Derniers contenus du secteur",
      homeDescription: "Consultez les avis de service, informations sectorielles et contenus réglementaires publiés.",
      relatedTitle: "Articles connexes",
    },
  },
} as const;

export function getMarketingCopy(locale: Locale) {
  return copyByLocale[locale];
}

export function getOperationStages(locale: Locale): OperationStage[] {
  return copyByLocale[locale].process.stages.map((stage) => ({ ...stage }));
}

export function getSolutionUiContent(
  locale: Locale,
  key: SolutionKey,
): SolutionUiContent {
  const profile = solutionProfiles[key];
  return {
    title: profile.title[locale],
    summary: profile.summary[locale],
    capabilities: profile.capabilities.map((item) => item[locale]),
    exclusion: profile.exclusion[locale],
  };
}

export function getSolutionPurposeGroups(locale: Locale): SolutionPurposeGroup[] {
  return purposeProfiles.map((group) => ({
    key: group.key,
    marker: group.marker,
    title: group.title[locale],
    description: group.description[locale],
    solutionKeys: group.solutionKeys,
    suitedFor: group.suitedFor.map((item) => item[locale]),
    process: group.process.map((item, index) => ({
      title: item[locale],
      description: group.processDescriptions[index][locale],
    })),
    requiredInfo: group.requiredInfo.map((item) => item[locale]),
  }));
}

export function getSolutionPurpose(
  locale: Locale,
  solutionKey: SolutionKey,
) {
  return getSolutionPurposeGroups(locale).find((group) =>
    group.solutionKeys.some((key) => key === solutionKey),
  );
}
