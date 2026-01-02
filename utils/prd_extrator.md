# PRD – Aplicação de Importação e Análise Inteligente de Dados de Acidentes

## 1. Visão Geral

### Problema
Os dados de pessoas envolvidas em acidentes chegam em planilhas e arquivos GXL, sem padronização e sem classificação clara sobre quais registros são aproveitáveis para os produtos disponíveis. A análise manual é lenta, sujeita a erro e não escala.

### Objetivo do Produto
Criar uma aplicação local que:
- Importe arquivos tabulares (planilhas e GXL)
- Normalize, valide e armazene os dados em banco
- Classifique automaticamente os registros via regras e IA
- Indique quais dados são descartáveis e quais se encaixam em cada produto

### Definição de Sucesso
- Importação correta $\ge 99\%$ dos registros válidos
- Classificação automática com justificativa para 100% dos registros 
- Tempo de análise aceitável para até 50.000 linhas
- Execução local sem dependência de infraestrutura externa

---

## 2. Escopo

### Em Escopo
- Upload de 1 a 3 arquivos por execução
- Suporte a CSV, XLSX e GXL
- Extração e persistência em banco local
- Interface web simples para upload, visualização e análise
- Classificação: DESCARTAR, PRODUTO_A, PRODUTO_B
- Exportação em CSV e JSON

### Fora de Escopo
- Autenticação corporativa
- Multiusuário
- Dashboards avançados
- Deploy em nuvem

### Premissas
- Execução local controlada
- Operação assistida
- Chave de IA disponível via variável de ambiente

---

## 3. Personas e Casos de Uso

### Persona Principal
Analista operacional responsável por tratar bases de dados e identificar oportunidades de produto.

### Casos de Uso
- **Importar:** Carregar arquivos recebidos.
- **Validar:** Corrigir dados inconsistentes.
- **Analisar:** Executar análise inteligente.
- **Exportar:** Gerar relatórios consolidados.

---

## 4. Fluxos da Aplicação

### Fluxo A – Upload
1. Seleção de 1 a 3 arquivos
2. Identificação automática do tipo
3. Validação inicial

### Fluxo B – Extração
1. Parsing dos arquivos
2. Normalização de campos
3. Marcação de registros inválidos

### Fluxo C – Análise
1. Ativação da flag “Analisar com IA”
2. Execução do prompt configurado
3. Classificação individual

### Fluxo D – Visualização
1. Tabela filtrável
2. Painel com métricas

### Fluxo E – Exportação
1. Geração de CSV ou JSON
2. Download local

---

## 5. Requisitos Funcionais

### Upload e Parsing
- Suporte a CSV, XLSX e GXL
- Parser tolerante a colunas ausentes

### Normalização
- Datas no formato ISO (DD-MM-YYYY)
- Telefones apenas números
- Documentos apenas dígitos

### Validação
- Campos obrigatórios: nome, data_nascimento, documento, motivo
- Registros inválidos mantidos com status informativo

### Deduplicação
- Chave lógica: documento
- Conflitos sinalizados para revisão

### Persistência
- Histórico completo de importação

### Análise
- Execução sob demanda
- Resultado por registro: status, justificativa

### Relatórios
- Contagem por status
- Percentual de aproveitamento

---

## 6. Requisitos Não Funcionais

### Execução
- Ambiente local (Windows/Linux)

### Segurança
- Chaves em `.env`
- Dados mascarados na interface
- Logs sem informações pessoais (PII)

### Privacidade
- Armazenamento local
- Exclusão total de dados via interface

### Performance
- Suporte para até 50.000 registros
- Processamento em lote (batch processing)

### Observabilidade
- Logs estruturados

---

## 7. Modelo de Dados

### Tabela: `imports`
- `id`, `filename`, `uploaded_at`, `status`

### Tabela: `people_records`
- `id`, `import_id`, `nome`, `data_nascimento`, `documento`, `telefone`, `motivo_acidente`, `valid`, `error_message`, `created_at`

### Tabela: `analyses`
- `id`, `record_id`, `status`, `justificativa`, `prompt_version`, `analyzed_at`

### Tabela: `prompt_versions`
- `id`, `name`, `content`, `created_at`

---

## 8. Regras de Classificação

### Estratégia
- Regras determinísticas primeiro (custo zero)
- IA para exceções e casos ambíguos

### Exemplos
- Motivos fora da lista → `DESCARTAR`
- Motivos do tipo A → `PRODUTO_A`
- Motivos do tipo B → `PRODUTO_B`

### Configuração
- Arquivo `rules.yaml` editável sem redeploy.

---

## 9. Integração com IA

### Abordagem
- API externa via variável de ambiente
- Processamento em lote para economia de tokens

### Formato do Prompt
- **Entrada:** motivo_do_acidente
- **Saída:**
```json
{
  "status": "DESCARTAR | PRODUTO_A | PRODUTO_B",
  "justificativa": "texto curto"
}

---

## 10. UX / UI (Wireframe Textual)

### Tela Upload
- Área de *drag-and-drop* para seleção de múltiplos arquivos.
- Lista de arquivos pendentes com status visual de "Pronto para importar".
- Botão principal de "Processar Arquivos".

### Tela Registros
- Tabela de dados com paginação (ex: 50 registros por página).
- Filtros rápidos: `Válidos`, `Inválidos`, `Pendentes de IA`.
- Campo de busca global para localizar Nome ou Documento específico.

### Tela Análise
- Painel lateral com resumo da configuração do motor de regras.
- Toggle para ativar/desativar o uso de IA.
- Seletor de versão do prompt de comando.
- Botão "Executar Análise em Lote".

### Tela Resultados
- Dashboard com indicadores: Total Processado, registros PRODUTO_A, PRODUTO_B e Descartados.
- Botão para exportação em formato CSV ou JSON (local).

---

## 11. Critérios de Aceite

- **Capacidade:** Importar e persistir 50.000 registros sem erro de *timeout* ou estouro de memória.
- **Hierarquia:** O sistema deve garantir que nenhum registro seja enviado para a IA se ele puder ser resolvido pelas regras do `rules.yaml`.
- **Integridade:** Dados exportados devem manter a mesma formatação (ISO) da normalização aplicada no banco.
- **Portabilidade:** A aplicação deve rodar em ambiente local via Docker ou Script Python sem necessidade de infraestrutura cloud.

---

## 12. Plano de Testes

- **Testes de Parsing:** Validar leitura de arquivos com colunas em ordens diferentes.
- **Testes de Normalização:** Verificar se CPFs e Telefones com máscaras variadas são limpos corretamente.
- **Testes de Carga:** Medir o tempo de resposta do sistema com uma base de 20.000 linhas.
- **Testes de Regras:** Garantir que a lógica de "DESCARTAR" no YAML está funcionando antes da IA.

---

## 13. Stack Recomendada

- **Backend:** Python (FastAPI + SQLAlchemy).
- **Banco de Dados:** SQLite (pela simplicidade local e portabilidade).
- **Frontend:** React + Tailwind CSS ou Streamlit (se o foco for velocidade de desenvolvimento).
- **IA:** Integração via biblioteca `openai` ou `anthropic` (Python).

---

## 14. Riscos e Mitigação

| Risco | Mitigação |
| :--- | :--- |
| **Dados ruins** | Validação rigorosa no parser e normalização obrigatória. |
| **Ambiguidade** | Uso combinado de regras determinísticas fixas + refinamento por IA. |
| **LGPD** | Controle 100% local dos dados e opção de exclusão total do banco. |
| **Custo de IA** | Uso seletivo via filtros prévios e chamadas em lote (batching). |
| **Vazamento** | Chaves sensíveis em arquivo `.env` e logs estruturados sem PII. |