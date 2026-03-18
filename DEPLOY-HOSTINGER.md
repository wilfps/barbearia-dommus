# Deploy Dommus na Hostinger VPS

Este guia foi feito para subir a Dommus na VPS da Hostinger sem depender do PC local.

## 1. O que vamos usar

- VPS Hostinger com Ubuntu
- Node.js
- PM2 para manter o app no ar
- dominio `barbeariadommus.com.br`

## 2. O que precisa existir antes

- VPS ativa
- dominio apontando para a Hostinger
- senha root definida
- projeto salvo no computador

## 3. O que precisa ir para a VPS

- codigo do projeto
- arquivo `.env`
- banco SQLite em caminho persistente
- pasta `public/uploads/` se quiser manter fotos ja enviadas

## 4. Variaveis importantes do `.env`

Exemplo minimo:

```env
DB_PATH=/var/lib/dommus/dommus.db
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

## 6. Configurar o SQLite fora da pasta do app

O ideal na VPS e deixar o banco fora de `/root/dommus-app`, assim ele nao fica misturado com o codigo.

```bash
mkdir -p /var/lib/dommus
mkdir -p /var/backups/dommus
chmod 755 /var/lib/dommus
chmod 755 /var/backups/dommus
```

No arquivo `.env`, use:

```env
DB_PATH=/var/lib/dommus/dommus.db
```

## 7. Subir o projeto

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

## 8. Portas e acesso

O app Next sobe por padrao na porta `3000`.

Se for testar direto pelo IP:

```bash
PORT=3000 npm run start
```

## 9. Recomendacao de producao

O ideal depois e colocar Nginx na frente para:

- usar o dominio
- ativar HTTPS
- fazer proxy para `localhost:3000`

## 10. Banco atual

Agora o projeto aceita SQLite em caminho configuravel por `DB_PATH`.

Recomendacao na VPS:

```text
/var/lib/dommus/dommus.db
```

Funciona bem para subir rapido e manter os cadastros separados do codigo.

Para producao mais segura, o proximo passo recomendado continua sendo migrar para PostgreSQL gerenciado.

## 11. Backup minimo

Se ainda estiver usando SQLite, sempre copie:

- `/var/lib/dommus/dommus.db`
- `public/uploads/`

Backup manual simples:

```bash
cp /var/lib/dommus/dommus.db /var/backups/dommus/dommus-$(date +%F-%H%M%S).db
```

## 12. Ordem recomendada

1. Subir o projeto na VPS
2. Configurar `DB_PATH`
3. Confirmar acesso pelo IP
4. Apontar dominio
5. Ativar HTTPS
6. Depois migrar banco para PostgreSQL
