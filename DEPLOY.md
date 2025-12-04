# 📺 Deploy para TV LG webOS

Guia completo para instalar o IPTV Player na sua TV LG.

---

## Pré-requisitos

### 1. Criar Conta de Desenvolvedor LG

1. Acesse: **https://webostv.developer.lge.com/**
2. Clique em **"Sign In"** → **"Create Account"**
3. Preencha os dados e confirme o email
4. Faça login na conta criada

---

## Etapa 1: Instalar webOS CLI

Abra o terminal como **Administrador** e execute:

```powershell
npm install -g @webos-tools/cli
```

Verifique a instalação:

```powershell
ares --version
```

---

## Etapa 2: Ativar Developer Mode na TV

### Na sua TV LG:

1. Abra a **LG Content Store**
2. Busque por: `Developer Mode`
3. **Instale** o aplicativo "Developer Mode"
4. **Abra** o app Developer Mode
5. **Faça login** com sua conta LG Developer
6. Ative **"Dev Mode Status"** → **ON**
7. Ative **"Key Server"** → **ON** (anote a senha que aparecer!)
8. **Reinicie a TV** quando solicitado

> ⚠️ **Importante**: O Developer Mode expira a cada 50 horas. Você precisa reativar periodicamente.

---

## Etapa 3: Descobrir o IP da TV

Na sua TV:

1. Vá em **Configurações** → **Rede** → **Conexão Wi-Fi/Ethernet**
2. Veja os detalhes da conexão
3. **Anote o endereço IP** (ex: `192.168.1.100`)

---

## Etapa 4: Configurar Dispositivo no CLI

No terminal do seu PC:

```powershell
ares-setup-device
```

Siga o menu interativo:

1. Escolha **"add"** para adicionar dispositivo
2. **Device Name**: `lgtv` (ou qualquer nome)
3. **IP Address**: O IP da sua TV (ex: `192.168.1.100`)
4. **Port**: `9922` (padrão)
5. **SSH User**: `prisoner`
6. **Authentication**: `password`
7. **Password**: A senha mostrada no app Developer Mode da TV

Verifique a conexão:

```powershell
ares-device-info -d lgtv
```

---

## Etapa 5: Empacotar o Aplicativo

Navegue até a pasta do projeto:

```powershell
cd d:\SISTEMAS\player-iptv
```

Gere o pacote .ipk:

```powershell
ares-package .
```

Isso criará: `com.iptv.player_1.0.0_all.ipk`

---

## Etapa 6: Instalar na TV

```powershell
ares-install com.iptv.player_1.0.0_all.ipk -d lgtv
```

---

## Etapa 7: Iniciar o App

```powershell
ares-launch com.iptv.player -d lgtv
```

O app **IPTV Player** agora deve aparecer na TV! 🎉

---

## Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `ares-launch com.iptv.player -d lgtv` | Iniciar app |
| `ares-launch -c com.iptv.player -d lgtv` | Fechar app |
| `ares-inspect com.iptv.player -d lgtv` | Abrir DevTools |
| `ares-device -d lgtv` | Verificar conexão |
| `ares-install --list -d lgtv` | Listar apps |
| `ares-install -r com.iptv.player -d lgtv` | Remover app |

---

## Debug/Inspeção

Para ver erros e console.log na TV:

```powershell
ares-inspect com.iptv.player -d lgtv --open
```

---

## Resumo Rápido

```powershell
# 1. Instalar CLI (uma vez)
npm install -g @webos-tools/cli

# 2. Configurar TV (uma vez)
ares-setup-device

# 3. Empacotar
ares-package .

# 4. Instalar
ares-install com.iptv.player_1.0.0_all.ipk -d lgtv

# 5. Abrir
ares-launch com.iptv.player -d lgtv
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| "Connection refused" | Verifique se Developer Mode está ON na TV |
| "Authentication failed" | A senha mudou, reconfigure com `ares-setup-device` |
| App não aparece | Verifique o `appinfo.json` |
| TV não encontrada | PC e TV devem estar na mesma rede |
