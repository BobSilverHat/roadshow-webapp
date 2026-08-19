-- 041_beginner_question_rebalance.sql
-- Rebalance both challenges for attendees who are new to the Salt platform.
-- Feedback was that the set skewed too hard: too much counting, too much long-
-- string typing, and answers that only exist on screen as icons.
--
-- CHALLENGE 1
--   Q1, Q2  unchanged.
--   Q3      REPLACED  -> the single 8.0 capability (notifications.webhook).
--   Q4      REPLACED  -> highest-risk tool on the dataops MCP
--                       (snowflake.query.execute).
--   Q5      MOVED     -> now holds the former Q3 posture-gap question, which
--                       becomes the hardest/last question. The former Q5
--                       ("distinct MCP methods", answer 6) is RETIRED: it sent
--                       beginners to Discovery Inventory, a screen no scenario
--                       walks through, and "20 capabilities" on screen was a
--                       guaranteed wrong-answer trap.
--
-- CHALLENGE 2
--   Every prompt that referenced the attacker as
--   'HASHED:b5054931dd19c11e05ca180bd8bc3981' now names the attacker as
--   llm-mass-refund@sora-financial.com (Q1-Q4).
--   Q1, Q2  answers unchanged (9 / Prompt Injection); prompt reworded for the
--           new attacker id only.
--   Q3      REWORDED  -> asks for the OTHER user-agent. The UI clips
--                       "Sora-BillingAgent/1.0 MCP..." so the old answer forced
--                       attendees to type a string they cannot fully read.
--                       43-char multi-value answer -> 19-char single value.
--   Q4      REPLACED  -> risk type that caught the missing AIDR header on
--                       POST /mcp/tools/call/plaid.identity.verify
--                       (Parameter Tampering).
--   Q5      REPLACED  -> the cash-out body field (refund_to_card). The former
--                       Q5 (Singapore double-BOLA, answer "id") is RETIRED.
--
-- Row ids, order_idx values and question_id references are all preserved: this
-- rewrites content in place, so no client state keyed on question_id breaks and
-- the (challenge_id, order_idx) unique constraint is never touched.
--
-- Hint cardinality is set identically in hints and hints_pt for every row,
-- because request_hint() indexes them positionally and questions_public
-- .hint_count derives from the English array (see 023, 040).

-- =====================================================================
-- CHALLENGE 1
-- =====================================================================

-- Q3 (REPLACED) -- the single 8.0 capability
update public.questions set
  prompt = $b$In the Agentic Inventory, switch the "View by MCPs" dropdown to "View by Capabilities" and sort the table by Risk Score, highest first. Exactly one capability has a Risk Score of 8.0. What is its Capability name?$b$,
  prompt_pt = $b$No Agentic Inventory, mude o seletor de "View by MCPs" para "View by Capabilities" e ordene a tabela por Risk Score, do maior para o menor. Exatamente uma capability tem Risk Score 8.0. Qual é o nome dela?$b$,
  answer_hash = encode(extensions.digest(public.normalize_answer($b$notifications.webhook$b$), 'sha256'), 'hex'),
  alt_answer_hashes = array[
    encode(extensions.digest(public.normalize_answer($b$notification.webhook$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$notifications webhook$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$notifications.webhook.$b$), 'sha256'), 'hex')
  ],
  hints = array[
    $b$In the Agentic Inventory, switch the view dropdown from "View by MCPs" to "View by Capabilities", then click the Risk Score column to sort highest first.$b$,
    $b$Work down from the 9.4 and 8.4 rows. Exactly one capability sits at 8.0, and its name ends in .webhook. Type it exactly, dot included.$b$
  ],
  hints_pt = array[
    $b$No Agentic Inventory, mude o seletor de "View by MCPs" para "View by Capabilities" e clique na coluna Risk Score para ordenar do maior para o menor.$b$,
    $b$Desça a partir das linhas 9.4 e 8.4. Exatamente uma capability fica em 8.0, e o nome dela termina em .webhook. Digite exatamente, com o ponto.$b$
  ]
where challenge_id = 1 and order_idx = 3;

-- Q4 (REPLACED) -- highest-risk tool on the dataops MCP
update public.questions set
  prompt = $b$Back on "View by MCPs", click the row for dataops.sora-financial.com/mcp to open its side drawer, then open the "Capabilities" tab. Of the six tools listed, which one has the highest Risk Score?$b$,
  prompt_pt = $b$De volta em "View by MCPs", clique na linha de dataops.sora-financial.com/mcp para abrir o painel lateral e vá até a aba "Capabilities". Das seis tools listadas, qual tem o maior Risk Score?$b$,
  answer_hash = encode(extensions.digest(public.normalize_answer($b$snowflake.query.execute$b$), 'sha256'), 'hex'),
  alt_answer_hashes = array[
    encode(extensions.digest(public.normalize_answer($b$snowflake query execute$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$snowflake.query.execute.$b$), 'sha256'), 'hex')
  ],
  hints = array[
    $b$In the Agentic Inventory on "View by MCPs", click the dataops.sora-financial.com/mcp row to open its side drawer, then open the "Capabilities" tab.$b$,
    $b$The tab badge shows 6 tools. Five of them score 5.7 or lower; only one is higher. Type the tool name exactly, dots included.$b$
  ],
  hints_pt = array[
    $b$No Agentic Inventory, em "View by MCPs", clique na linha dataops.sora-financial.com/mcp para abrir o painel lateral e abra a aba "Capabilities".$b$,
    $b$O badge da aba mostra 6 tools. Cinco delas têm 5.7 ou menos; só uma é maior. Digite o nome da tool exatamente, com os pontos.$b$
  ]
where challenge_id = 1 and order_idx = 4;

-- Q5 (MOVED from Q3) -- posture gap, now the hardest/last question
update public.questions set
  prompt = $b$On tool plaid.identity.verify, which posture gap related to GDPR has the highest severity?$b$,
  prompt_pt = $b$Na tool plaid.identity.verify, qual posture gap relacionado ao GDPR tem a maior severidade?$b$,
  answer_hash = encode(extensions.digest(public.normalize_answer($b$Prohibition of social security numbers in api responses$b$), 'sha256'), 'hex'),
  alt_answer_hashes = array[
    encode(extensions.digest(public.normalize_answer($b$Prohibition of social security numbers in API responses.$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$Prohibition of social security numbers in responses$b$), 'sha256'), 'hex')
  ],
  hints = array[
    $b$Find plaid.identity.verify in the Agentic Inventory, Discovery Inventory, or Agentic Graph. Open its side drawer and navigate to the "Posture Gaps" tab.$b$,
    $b$Scan the Policy Categories column for GDPR, then take the highest-severity row among those. Copy the gap name exactly as written; it is a full sentence.$b$
  ],
  hints_pt = array[
    $b$Encontre plaid.identity.verify no Agentic Inventory, Discovery Inventory ou Agentic Graph. Abra o side drawer e vá até a aba "Posture Gaps".$b$,
    $b$Procure GDPR na coluna Policy Categories e pegue a linha de maior severidade entre elas. Copie o nome do gap exatamente como está escrito; é uma frase completa.$b$
  ]
where challenge_id = 1 and order_idx = 5;

-- =====================================================================
-- CHALLENGE 2  -- attacker id: HASHED:b5054931... -> llm-mass-refund@sora-financial.com
-- =====================================================================

-- Q1 -- attacker id only; answer unchanged (9)
update public.questions set
  prompt = $b$Including suspicious attempts, how many distinct risk type detections were triggered for attacker 'llm-mass-refund@sora-financial.com'?$b$,
  prompt_pt = $b$Incluindo suspicious attempts, quantas detecções distintas de risk type foram acionadas para o atacante 'llm-mass-refund@sora-financial.com'?$b$
where challenge_id = 2 and order_idx = 1;

-- Q2 -- attacker id only; answer unchanged (Prompt Injection)
update public.questions set
  prompt = $b$Attacker 'llm-mass-refund@sora-financial.com': what sub-risk type under the parent risk type "Large Language Model" was flagged?$b$,
  prompt_pt = $b$Atacante 'llm-mass-refund@sora-financial.com': qual sub-risk type sob o risk type "Large Language Model" foi sinalizado?$b$
where challenge_id = 2 and order_idx = 2;

-- Q3 (REWORDED) -- ask for the OTHER user-agent; the Sora one is clipped on screen
update public.questions set
  prompt = $b$On the "Sources" tab for attacker 'llm-mass-refund@sora-financial.com', Salt shows 2 distinct user-agents. One is the Sora billing agent. What is the other, exactly as listed?$b$,
  prompt_pt = $b$Na aba "Sources" do atacante 'llm-mass-refund@sora-financial.com', Salt mostra 2 user-agents distintos. Um é o agente de billing da Sora. Qual é o outro, exatamente como aparece na lista?$b$,
  answer_hash = encode(extensions.digest(public.normalize_answer($b$python-httpx/0.28.1$b$), 'sha256'), 'hex'),
  alt_answer_hashes = array[
    encode(extensions.digest(public.normalize_answer($b$python-httpx$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$httpx/0.28.1$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$python-httpx 0.28.1$b$), 'sha256'), 'hex')
  ],
  hints = array[
    $b$Open the attacker profile and go to the "Sources" tab, with "Display Suspicious Attempts" turned on. Every user-agent seen for this attacker is listed there.$b$
  ],
  hints_pt = array[
    $b$Abra o perfil do atacante e vá até a aba "Sources", com "Display Suspicious Attempts" ativado. Todos os user-agents vistos para este atacante estão listados lá.$b$
  ]
where challenge_id = 2 and order_idx = 3;

-- Q4 (REPLACED) -- risk type that caught the missing AIDR header
update public.questions set
  prompt = $b$Within the attack chain for llm-mass-refund@sora-financial.com, the CrowdStrike Falcon AIDR header was seen missing from this request POST /mcp/tools/call/plaid.identity.verify; what risk type detection caught this?$b$,
  prompt_pt = $b$Dentro da cadeia de ataque de llm-mass-refund@sora-financial.com, o header do CrowdStrike Falcon AIDR apareceu ausente nesta requisição POST /mcp/tools/call/plaid.identity.verify; qual risk type detection capturou isso?$b$,
  answer_hash = encode(extensions.digest(public.normalize_answer($b$Parameter Tampering$b$), 'sha256'), 'hex'),
  alt_answer_hashes = array[
    encode(extensions.digest(public.normalize_answer($b$parameter tampering detection$b$), 'sha256'), 'hex')
  ],
  hints = array[
    $b$Open the attacker's Timeline, turn on "Display Suspicious Attempts", and find the POST /mcp/tools/call/plaid.identity.verify attempt.$b$,
    $b$Salt files every missing required header under a risk type. Read the risk types listed on that event; the one you want is about tampering with request parameters.$b$
  ],
  hints_pt = array[
    $b$Abra a Timeline do atacante, ative "Display Suspicious Attempts" e encontre a tentativa POST /mcp/tools/call/plaid.identity.verify.$b$,
    $b$Salt registra cada header obrigatório ausente sob um risk type. Leia os risk types listados nesse evento; o que você procura é sobre adulteração de parâmetros da requisição.$b$
  ]
where challenge_id = 2 and order_idx = 4;

-- Q5 (REPLACED) -- the cash-out body field
update public.questions set
  prompt = $b$At the end of the attack chain, we see the user successfully perform mass refunds to a card in their possession. What body field is flagged Unexpected Unknown Parameter?$b$,
  prompt_pt = $b$No fim da cadeia de ataque, vemos o usuário realizar com sucesso refunds em massa para um cartão em posse dele. Qual body field é sinalizado como Unexpected Unknown Parameter?$b$,
  answer_hash = encode(extensions.digest(public.normalize_answer($b$refund_to_card$b$), 'sha256'), 'hex'),
  alt_answer_hashes = array[
    encode(extensions.digest(public.normalize_answer($b$body.refund_to_card$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$refund-to-card$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$refund to card$b$), 'sha256'), 'hex')
  ],
  hints = array[
    $b$Turn on "Display Suspicious Attempts" and open the last event in the attacker's Timeline, a POST /v1/refunds attempt flagged for rate limiting.$b$,
    $b$In that event open API DETAILS, then Request, then Body. One field is highlighted and badged "Unexpected Unknown Parameter".$b$,
    $b$The body has two fields. One is currency. The other is snake_case and names where the refund is being sent. Include the underscores.$b$
  ],
  hints_pt = array[
    $b$Ative "Display Suspicious Attempts" e abra o último evento da Timeline do atacante, uma tentativa POST /v1/refunds sinalizada por rate limiting.$b$,
    $b$Nesse evento, abra API DETAILS, depois Request, depois Body. Um campo aparece destacado e com o badge "Unexpected Unknown Parameter".$b$,
    $b$O body tem dois campos. Um é currency. O outro está em snake_case e indica para onde o refund está indo. Inclua os underscores.$b$
  ]
where challenge_id = 2 and order_idx = 5;

-- ---------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------
-- Expect 10 rows, every match_primary = true, and hints/hints_pt cardinality
-- equal on every row:
--
--   select challenge_id, order_idx, cardinality(hints) = cardinality(hints_pt) as hint_parity,
--          cardinality(alt_answer_hashes) as n_alts
--   from public.questions order by challenge_id, order_idx;
