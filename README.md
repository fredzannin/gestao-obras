# Sistema de Gestão de Obras

Sistema web de orçamento e gestão de obras construído com Next.js + Supabase + Vercel.

---

## PASSO 1 — Configurar o banco de dados (Supabase)

1. Acesse https://supabase.com/dashboard
2. Entre no seu projeto **fredzannin's Project**
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**
5. Abra o arquivo `supabase_schema.sql` deste projeto
6. Copie TODO o conteúdo e cole no SQL Editor
7. Clique em **Run** (botão verde)
8. Deve aparecer "Success" — as tabelas foram criadas!

---

## PASSO 2 — Configurar as chaves do Supabase

1. No Supabase, vá em **Settings → Data API**
2. Copie a **Project URL** e a **anon public key**
3. Abra o arquivo `.env.local` neste projeto
4. Substitua os valores:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...sua_chave_aqui
```

---

## PASSO 3 — Rodar o projeto no seu computador

Abra o VS Code na pasta do projeto.
Abra o Terminal (Ctrl + `) e rode:

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 no navegador.
O sistema já deve estar funcionando!

---

## PASSO 4 — Publicar na internet (Vercel)

### 4.1 — Subir o código para o GitHub

```bash
git init
git add .
git commit -m "primeiro commit - gestao de obras"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/gestao-obras.git
git push -u origin main
```

> Crie o repositório em https://github.com/new antes deste passo.
> Nome sugerido: gestao-obras

### 4.2 — Conectar ao Vercel

1. Acesse https://vercel.com/dashboard
2. Clique em **Add New → Project**
3. Selecione o repositório **gestao-obras** do GitHub
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` → sua URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → sua chave anon
5. Clique em **Deploy**

Pronto! Em 1-2 minutos o sistema estará online com um link do tipo:
`https://gestao-obras-seuusuario.vercel.app`

---

## Atualizar o sistema depois

Sempre que fizer alterações no VS Code:

```bash
git add .
git commit -m "descrição da alteração"
git push
```

O Vercel detecta automaticamente e atualiza o site em 1-2 minutos.

---

## Módulos disponíveis (v1.0)

- [x] Dashboard de obras (lista, status, BDI)
- [x] Módulo de orçamento completo
  - [x] Etapas configuráveis
  - [x] Serviços com código SINAPI/SICRO/Própria
  - [x] BDI global com cálculo automático
  - [x] Exportação Excel e PDF
- [ ] Cronograma físico-financeiro (próxima versão)
- [ ] Controle de materiais/estoque (próxima versão)
- [ ] Gestão de contratos e medições (próxima versão)

---

## Suporte

Em caso de dúvidas, descreva o problema no chat com o Claude
incluindo qualquer mensagem de erro que aparecer no terminal.
