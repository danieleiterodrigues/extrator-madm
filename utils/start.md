# Guia de Inicialização do Projeto

Este projeto consiste em um Backend em Python (FastAPI) e um Frontend em React (Vite).
Siga os passos abaixo para iniciar a aplicação localmente.

## Pré-requisitos
- **Node.js**: [Download](https://nodejs.org/)
- **Python**: [Download](https://www.python.org/)

## 1. Configurando e Iniciando o Backend

1. Abra o terminal e navegue até a pasta `backend`:
   ```bash
   cd backend
   ```

2. Crie um ambiente virtual (recomendado para isolar as dependências):
   ```bash
   python -m venv venv
   ```

3. Ative o ambiente virtual:
   - **Windows (PowerShell):**
     ```bash
     .\venv\Scripts\Activate
     ```
   - **Windows (CMD):**
     ```bash
     venv\Scripts\activate.bat
     ```

4. Instale as dependências do projeto:
   ```bash
   pip install -r requirements.txt
   ```

5. Inicie o servidor:
   ```bash
   uvicorn app.main:app --reload
   ```
   > O servidor backend iniciará em `http://127.0.0.1:8000`. Mantenha este terminal aberto.

## 2. Configurando e Iniciando o Frontend

1. Abra um **novo terminal** (não feche o do backend) e navegue até a pasta `Extrator`:
   ```bash
   cd Extrator
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. (Opcional) Configuração de Variáveis de Ambiente:
   Se for utilizar funcionalidades de IA, crie um arquivo `.env` na raiz da pasta `Extrator` contendo sua chave da API:
   ```
   GEMINI_API_KEY=sua_chave_aqui
   ```

4. Inicie o servidor frontend:
   ```bash
   npm run dev
   ```
   > O frontend iniciará em `http://localhost:3000` (conforme configurado no `vite.config.ts`).

## 3. Acessando a Aplicação

Abra o navegador e acesse: [http://localhost:3000](http://localhost:3000)

A aplicação deve carregar e conectar-se automaticamente ao backend rodando na porta 8000.
