# Deploy Dommus na Hostinger VPS

Este guia foi feito para subir a Dommus na VPS da Hostinger sem depender do PC local.

## 1. O que vamos usar

- VPS Hostinger com Ubuntu
- Node.js
- PM2 para manter o app no ar
- domínio `barbeariadommus.com.br`

## 2. O que precisa existir antes

- VPS ativa
- domínio apontando para a Hostinger
- senha root definida
- projeto salvo no computador

## 3. O que precisa ir para a VPS

- código do projeto
- arquivo `.env`
- banco `data/dommus.db` se ainda for usar SQLite
- pasta `public/uploads/` se quiser manter fotos já enviadas

## 4. Variáveis importantes do `.env`

Exemplo minimo:

```env
AUTH_SECRET=troque-por-uma-chave-bem-forte
WHATSAPP_PROVIDER=meta-cloud-api
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_NUMBER=5511999999999
PIX_PROVIDER=mercado-pago
PIX_API_BASE_URL=
PIX_API_TOKEN=
PIX_KEY=
```

## 5. Comandos base na VPS

Depois de entrar na VPS:

```bash
apt update && apt upgrade -y
apt install -y curl git unzip
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
```

## 6. Subir o projeto

Se for usar GitHub:

```bash
git clone SEU_REPOSITORIO dommus-app
cd dommus-app
npm install
npm run build
pm2 start npm --name dommus -- start
pm2 save
pm2 startup
```

## 7. Portas e acesso

O app Next sobe por padrao na porta `3000`.

Se for testar direto pelo IP:

```bash
PORT=3000 npm run start
```

## 8. Recomendação de produção

O ideal depois é colocar Nginx na frente para:

- usar o domínio
- ativar HTTPS
- fazer proxy para `localhost:3000`

## 9. Banco atual

Hoje o projeto usa SQLite em:

```text
data/dommus.db
```

Funciona para subir rápido.

Para produção mais segura, o próximo passo recomendado é migrar para PostgreSQL gerenciado.

## 10. Backup minimo

Se ainda estiver usando SQLite, sempre copie:

- `data/dommus.db`
- `public/uploads/`

## 11. Ordem recomendada

1. Subir o projeto na VPS
2. Confirmar acesso pelo IP
3. Apontar domínio
4. Ativar HTTPS
5. Depois migrar banco para PostgreSQL
