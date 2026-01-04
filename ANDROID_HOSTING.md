# Guia de Hospedagem no Android (Samsung S20 FE)

Sim, é possível hospedar este app no seu celular e acessar de qualquer dispositivo na mesma rede Wi-Fi!

Para isso, recomendo usar o **Termux**, um terminal Linux poderoso para Android.

## Passo a Passo

### 1. Instalar o Termux
Baixe e instale o **Termux**. Recomenda-se baixar a versão do [F-Droid](https://f-droid.org/packages/com.termux/), pois a versão da Play Store é desatualizada.

### 2. Configurar o Ambiente
Abra o Termux e execute os seguintes comandos, um por um, confirmando com `Y` quando perguntado:

```bash
# Atualizar pacotes
pkg update && pkg upgrade

# Instalar Node.js e Git
pkg install nodejs git
```

### 3. Baixar o Projeto
Vou assumir que você vai clonar do GitHub (se o projeto estiver privado, você precisará configurar uma chave SSH ou token).

```bash
# Clone seu repositório (substitua pela URL real)
git clone https://github.com/pedrabrancagames/iptv-player.git

# Entre na pasta
cd iptv-player
```

### 4. Instalar Dependências
Agora instale as bibliotecas necessárias para o servidor que acabamos de criar.

```bash
npm install
```

### 5. Iniciar o Servidor
Com tudo pronto, inicie o app:

```bash
npm start
```

### 6. Acessar de Outros Dispositivos
Após rodar o comando acima, o terminal mostrará algo como:

```
✅ Server Running!
📱 Local:   http://localhost:8080
📡 Network: http://192.168.1.15:8080
```

1.  Mantenha o Termux aberto (ou a notificação ativa).
2.  Vá em outro dispositivo (PC, TV, outro celular) conectado na **mesma rede Wi-Fi**.
3.  Digite o endereço "Network" (ex: `http://192.168.1.15:8080`) no navegador.

### Dica Pro
Para manter o servidor rodando mesmo com a tela bloqueada, na notificação do Termux, clique em "Acquire wakelock".
