-- 034_seed_pt_translations.sql
-- pt-BR translations for CTF content (challenge titles/subtitles, question
-- prompts, hints). Answers (answer_hash / alt_answer_hashes) are UNTOUCHED —
-- answers stay English, found in the English Salt platform. Frozen terms and
-- quoted UI labels stay English. hints_pt cardinality matches hints exactly.
-- Title prefix "Challenge N — " kept English so titleWithoutPrefix() still parses.

update public.challenges set
  title_pt    = $b$Challenge 1 — Descobrir e Governar$b$,
  subtitle_pt = $b$Agentic Discovery e Posture Management$b$
where id = 1;

update public.challenges set
  title_pt    = $b$Challenge 2 — Proteger$b$,
  subtitle_pt = $b$Runtime Protection em ação$b$
where id = 2;

-- Challenge 1
update public.questions set
  prompt_pt = $b$Quantos MCPs o Salt exibe atualmente no Agentic Inventory?$b$,
  hints_pt  = array[$b$Abra o Salt Agentic Graph para ver todos os MCP servers detectados na Sora Financial.$b$]
where challenge_id = 1 and order_idx = 1;

update public.questions set
  prompt_pt = $b$Qual a tecnologia que alimenta crm.sora-financial.com?$b$,
  hints_pt  = array[$b$Abra crm.sora-financial.com no Agentic Inventory, no MCP side drawer ou no Agentic Graph e procure o ícone "technology".$b$]
where challenge_id = 1 and order_idx = 2;

update public.questions set
  prompt_pt = $b$Na tool plaid.identity.verify, qual posture gap relacionado ao GDPR tem a maior severidade?$b$,
  hints_pt  = array[$b$Encontre plaid.identity.verify no Agentic Inventory, Discovery Inventory ou Agentic Graph. Abra o side drawer e vá até a aba "Posture Gaps".$b$]
where challenge_id = 1 and order_idx = 3;

update public.questions set
  prompt_pt = $b$Ordene a tabela Capabilities por risk score. Qual o nome e a technology da tool no topo?$b$,
  hints_pt  = array[$b$Dentro do Agentic Inventory, mude a visualização de "View by MCPs" para "Capabilities".$b$]
where challenge_id = 1 and order_idx = 4;

update public.questions set
  prompt_pt = $b$Quantos MCP methods distintos ai.sora-financial.com chama?$b$,
  hints_pt  = array[
    $b$Abra o Discovery Inventory, entre no host ai.sora-financial.com e conte os MCP methods distintos.$b$,
    $b$Procure os tipos padrão de requisição MCP usados para enumerar capabilities, listar recursos e disparar ações; methods como tools/list, resources/list e prompts/list. Conte cada method distinto apenas uma vez.$b$,
    $b$MCP methods também incluem chamadas como tools/call e resources/read; seu total final é menor que 10.$b$
  ]
where challenge_id = 1 and order_idx = 5;

-- Challenge 2
update public.questions set
  prompt_pt = $b$Incluindo tentativas suspeitas, quantas detecções distintas de risk type foram disparadas para o atacante 'HASHED:b5054931dd19c11e05ca180bd8bc3981'?$b$,
  hints_pt  = array[$b$No lado Protect da plataforma, abra o atacante e ative "Display Suspicious Attempts".$b$]
where challenge_id = 2 and order_idx = 1;

update public.questions set
  prompt_pt = $b$Atacante 'HASHED:b5054931dd19c11e05ca180bd8bc3981': qual sub-risk type sob o risk type principal "Large Language Model" foi sinalizado?$b$,
  hints_pt  = array[$b$Abra o perfil do atacante e localize o risk type "Large Language Model" — ao abri-lo, o sub-risk type aparece.$b$]
where challenge_id = 2 and order_idx = 2;

update public.questions set
  prompt_pt = $b$Qual o IP deste atacante 'HASHED:b5054931dd19c11e05ca180bd8bc3981' e qual é um user-agent distinto que ele foi visto usando?$b$,
  hints_pt  = array[$b$Depois de abrir o perfil do atacante, vá até "Sources" — lá estão listados todos os user-agents vistos para esse atacante.$b$]
where challenge_id = 2 and order_idx = 3;

update public.questions set
  prompt_pt = $b$Atacante 'HASHED:b5054931dd19c11e05ca180bd8bc3981': qual request method e URL foi flagrado retornando PII em excesso para ele?$b$,
  hints_pt  = array[$b$Abra o perfil do atacante, encontre o risk type "Excessive Data Exposure", expanda e clique no sub-risk type para revelar o request method e a API URL que dispararam a detecção.$b$]
where challenge_id = 2 and order_idx = 4;

update public.questions set
  prompt_pt = $b$Um atacante de Singapura foi sinalizado por um duplo BOLA (IDOR). Qual body parameter não correspondeu ao path parameter?$b$,
  hints_pt  = array[
    $b$No lado Protect da plataforma, filtre os atacantes por severidade e localize o associado ao IP 150.222.78.110 — é esse o atacante da questão.$b$,
    $b$Com o atacante aberto, vá até a aba Summary. Encontre o risk type "Broken Object Level Authorization" e abra um de seus sub-risk types para ver os detalhes.$b$,
    $b$Em "Broken Object Level Authorization", clique na API listada dentro de um dos dois sub-risk types — o painel de detalhes da API à direita expõe o body parameter que você precisa.$b$
  ]
where challenge_id = 2 and order_idx = 5;
