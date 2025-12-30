# Extrator de Acidentes - Documentação do Projeto

Este documento fornece instruções detalhadas para instalação, configuração e execução da aplicação Extrator de Acidentes.

## Pré-requisitos

Certifique-se de ter os seguintes softwares instalados em seu ambiente:

- **Node.js** (v18 ou superior)
- **Python** (v3.9 ou superior)
- **PostgreSQL** (Opcional - o sistema utiliza SQLite por padrão)

---

## 1. Instalação

### Backend (Python/FastAPI)

1. Abra o terminal e navegue até o diretório `backend`:
   ```bash
   cd backend
   ```

2. Crie um ambiente virtual para isolar as dependências:
   ```bash
   python -m venv venv
   ```

3. Ative o ambiente virtual:
   - **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate
     ```
   - **Windows (CMD):**
     ```cmd
     venv\Scripts\activate.bat
     ```
   - **Linux/Mac:**
     ```bash
     source venv/bin/activate
     ```

4. Instale as dependências listadas no arquivo `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend (React/Vite)

1. Abra um **novo terminal** e navegue até o diretório `Extrator`:
   ```bash
   cd Extrator
   ```

2. Instale as dependências do projeto via npm:
   ```bash
   npm install
   ```

---

## 2. Configuração

A configuração do sistema é realizada através de variáveis de ambiente no arquivo `.env` (localizado na pasta `backend`) ou diretamente pela interface do sistema após o login.

### Configuração do Arquivo .env

Crie um arquivo nomeado `.env` dentro do diretório `backend`.

**Exemplo de configuração:**

```ini
# Configurações de IA (Obrigatório para o Motor de Análise)
GEMINI_API_KEY=sua_chave_gemini_aqui
OPENAI_API_KEY=sua_chave_openai_aqui

# Banco de Dados (Opcional - Padrão: SQLite)
# Formato: postgresql://usuario:senha@host:porta/nome_banco
DATABASE_URL=postgresql://postgres:senha123@localhost:5432/extrator
```

### Configuração da API Key (IA)

A chave de API pode ser configurada de duas maneiras:

1.  **Via Arquivo `.env`**: Definindo `GEMINI_API_KEY` ou `OPENAI_API_KEY`.
2.  **Via Interface**: Acesse **Configurações** no menu do sistema e insira a chave no campo correspondente.

### Configuração do Banco de Dados

O sistema suporta **SQLite** e **PostgreSQL**.

1.  **SQLite**: Configuração padrão. O arquivo `extrator.db` será criado automaticamente no diretório `backend`.
2.  **PostgreSQL**:
    - Crie um banco de dados vazio no PostgreSQL.
    - Configure a variável `DATABASE_URL` no arquivo `.env` ou insira as credenciais via interface em **Configurações > Banco de Dados**.

---

## 3. Execução

Para executar o projeto, mantenha dois terminais abertos simultaneamente.

### Backend

No diretório `backend` (com o ambiente virtual ativado):

```bash
uvicorn app.main:app --reload
```
A API estará disponível em: `http://127.0.0.1:8000`

### Frontend

No diretório `Extrator`:

```bash
npm run dev
```
A aplicação web estará disponível em: `http://localhost:3000`

---

## 4. Execução Simplificada (Usuário Final)

Para facilitar o uso no dia a dia, o projeto inclui scripts de automação na raiz da pasta:

-   **`Abrir_Sistema.vbs`**: Inicia tudo silenciosamente e abre o navegador automaticamente. Ideal para uso diário.
-   **`iniciar.bat`**: Inicia o backend e frontend em janelas separadas. Útil para ver logs de erro se algo não funcionar.
-   **`Parar_Sistema.bat`**: Encerra todos os processos do sistema (Python e Node) de uma vez.

> **Nota**: Mesmo para o modo simplificado, as dependências (Python/Node) devem estar instaladas e o ambiente configurado pelo menos uma vez.

---

## 5. Acesso ao Sistema

Acesse [http://localhost:3000](http://localhost:3000) em seu navegador.

**Credenciais Padrão:**

- **Usuário**: `ADMIN`
- **Senha**: `adm123`

**Nota de Segurança**: Recomendamos alterar a senha ou criar novos usuários administradores através do menu de Configurações imediatamente após o primeiro acesso.

---

## Solução de Problemas

- **Erro "database is locked" (SQLite)**: Pode ocorrer com alto volume de gravações simultâneas. A migração para PostgreSQL é recomendada para ambientes de produção ou alta concorrência.
- **Backend indisponível**: Verifique se o serviço está rodando na porta 8000 e se não há erros de execução no terminal Python.
- **Dependências não encontradas**: Certifique-se de que o ambiente virtual (`venv`) está ativado antes de executar os comandos do backend.
