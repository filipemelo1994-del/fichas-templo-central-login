# Cadastro de Equipamentos — Templo Central (com login da equipe)

Este pacote transforma o app em algo que a **equipe inteira usa**, cada um
com seu próprio login, e as fichas ficam guardadas na nuvem (Firebase),
não mais só no celular de quem preencheu.

Isso exige criar uma conta gratuita no Firebase (Google) e configurar
algumas coisas — leva uns 20-30 minutos na primeira vez. Depois disso,
publicar é igual ao que você já fez no GitHub Pages.

> **Sobre custo:** vamos precisar ativar o plano **Blaze** do Firebase
> (ele pede um cartão de crédito cadastrado), porque duas coisas exigem
> esse plano: o **login por telefone (SMS)** e as **Cloud Functions**
> (usadas para trocar a senha quando a pessoa esquece e confirma pelo
> telefone). O Blaze tem uma cota gratuita generosa todo mês — para uma
> equipe pequena (alguns técnicos, uso normal) o custo esperado é **R$ 0,00**;
> só cobra se passar da cota gratuita (por exemplo, centenas de SMS por mês).

---

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e faça login com uma conta Google.
2. Clique em **Adicionar projeto**, dê um nome (ex.: `templo-central-fichas`).
3. Pode desativar o Google Analytics (não é necessário). Clique em **Criar projeto**.
4. Dentro do projeto, clique no ícone **`</>`** (Web) para criar um "app da Web".
5. Dê um apelido (ex.: `app-fichas`) e clique em **Registrar app**. **Não**
   marque a opção de hospedagem.
6. O Firebase mostra um bloco de código com `firebaseConfig = {...}`.
   **Copie esses valores** — você vai colá-los no arquivo `firebase-config.js`
   (deste pacote) daqui a pouco.

## 2. Ativar o plano Blaze

1. No menu lateral, clique na engrenagem → **Uso e faturamento**.
2. Clique em **Fazer upgrade** → escolha **Blaze (pagamento por utilização)**.
3. Cadastre um cartão. Você pode (recomendado) configurar um **orçamento/alerta**
   de R$ 5 ou R$ 10 em **Faturamento → Orçamentos e alertas**, para ser avisado
   se algum dia passar da cota gratuita.

## 3. Ativar a Autenticação (login)

1. No menu lateral: **Compilação → Authentication → Vamos começar**.
2. Na aba **Sign-in method**, ative:
   - **E-mail/senha** → Ativar → Salvar.
   - **Telefone** → Ativar → Salvar.
3. Ainda em Authentication, na aba **Settings → Domínios autorizados**,
   confira se o domínio onde você vai publicar o app está na lista
   (o `firebaseapp.com` do projeto já vem autorizado; se for publicar no
   GitHub Pages, adicione ali o domínio, ex.: `seu-usuario.github.io`).

## 4. Ativar o Firestore (banco de dados)

1. **Compilação → Firestore Database → Criar banco de dados**.
2. Escolha uma localização (ex.: `southamerica-east1` — São Paulo).
3. Comece em **modo de produção**.
4. Depois de criado, vá na aba **Regras** e substitua tudo pelo conteúdo
   abaixo, depois clique em **Publicar**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Perfis da equipe: qualquer pessoa logada pode ver a lista da equipe;
    // cada um só pode criar/editar o PRÓPRIO perfil.
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == userId;
    }

    // Fichas de equipamento: qualquer pessoa logada da equipe pode ver e editar.
    match /equipamentos/{eqId} {
      allow read, write: if request.auth != null;
    }

    // Contador usado para gerar o ID sequencial (EQ-0001, EQ-0002...).
    match /counters/{docId} {
      allow read, write: if request.auth != null;
    }

    // Códigos de confirmação por e-mail: precisa ficar acessível ANTES do
    // login (é exatamente o passo que cria o login). Os códigos expiram em
    // 10 minutos e não guardam nada sensível além do código em si — o risco
    // é aceitável para um app interno de equipe pequena.
    match /otpCodes/{email} {
      allow read, write: if true;
    }
  }
}
```

## 5. Storage (fotos e assinatura) — opcional, exige plano Blaze

O Firebase mudou a regra e hoje até para **ativar** o Storage (não só para
usar telefone/SMS) ele já pede o plano Blaze. Por isso, **nesta versão do
app as fotos e a assinatura são guardadas direto no Firestore** (em
base64, comprimidas bem pequenas), sem precisar do Storage. Você já pode
usar o app inteiro assim — login, cadastro de equipamento, fotos,
assinatura e PDF funcionam. A única diferença é um limite: cada ficha
aguenta em torno de 10-15 fotos pequenas antes de ficar "cheia" (o app
avisa quando isso acontecer).

Se um dia você ativar o Blaze e quiser fotos maiores/mais numerosas sem
esse limite, é só me pedir para trocar o armazenamento de fotos para o
Storage — é uma mudança pequena no código. Enquanto isso, **pule esta
seção** e vá direto para o passo 6.

<details>
<summary>Regras do Storage (só quando for ativar, no futuro)</summary>

1. **Compilação → Storage → Vamos começar** → mesma localização do Firestore.
2. Na aba **Regras**, substitua por:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /equipamentos/{eqId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
</details>

## 6. Criar a conta gratuita no EmailJS (código por e-mail)

1. Acesse https://www.emailjs.com e crie uma conta gratuita.
2. Em **Email Services → Add New Service**, conecte seu Gmail (ou Outlook)
   — é a partir dele que os códigos serão enviados. Anote o **Service ID**.
3. Em **Email Templates → Create New Template**, monte um modelo simples,
   por exemplo:
   - **To email**: `{{to_email}}`
   - **Subject**: `Seu código de confirmação — Fichas Templo Central`
   - **Content**:
     ```
     Olá {{nome}},

     Seu código de confirmação é: {{codigo}}

     Ele vale por 10 minutos.
     ```
   Salve e anote o **Template ID**.
4. Em **Account → General**, copie a **Public Key**.

## 7. Preencher o `firebase-config.js`

Abra o arquivo `firebase-config.js` (nesta pasta) e cole os valores que
você copiou nos passos 1 e 6:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

export const emailjsConfig = {
  publicKey: "...",
  serviceId: "...",
  templateId: "..."
};
```

## 8. Publicar a Cloud Function (troca de senha por telefone)

Isso precisa ser feito uma vez, pelo computador (com Node.js instalado):

1. Instale o Node.js (https://nodejs.org, versão LTS) se ainda não tiver.
2. Abra um terminal na pasta deste pacote e rode:
   ```
   npm install -g firebase-tools
   firebase login
   firebase init functions
   ```
   Quando perguntar, escolha **Use an existing project** e selecione o
   projeto que você criou. Quando perguntar sobre linguagem, escolha
   **JavaScript**. Se perguntar se quer sobrescrever `functions/index.js`
   e `functions/package.json`, escolha **Não** (já estão prontos aqui).
3. Rode:
   ```
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```
4. Ao final, aparece uma URL/confirmação de que `resetPasswordViaPhone`
   foi publicada. Pronto — não precisa mexer nisso de novo, a menos que
   eu (ou você) altere o código da função.

## 9. Publicar o app (GitHub Pages)

Igual ao que já fizemos antes:

1. Crie um repositório no GitHub (ex.: `fichas-templo-central`), público.
2. Faça upload de **todos os arquivos desta pasta, exceto a pasta `functions/`**
   (ela já foi publicada separadamente no passo 8): `index.html`,
   `firebase-config.js`, `manifest.json`, `sw.js` e a pasta `icons/`.
3. Em **Settings → Pages**, ative com a branch `main` e pasta `/ (root)`.
4. Acesse o link gerado (ex.: `https://seu-usuario.github.io/fichas-templo-central/`).
5. Volte ao passo 3 (Authentication → Settings → Domínios autorizados) e
   confirme que esse domínio `github.io` está na lista — sem isso o login
   não funciona.

## 10. Testando

1. Abra o link no celular, toque em **Cadastrar-se**.
2. Preencha nome, sobrenome, função, telefone, e-mail e senha.
3. Escolha confirmar por e-mail ou por telefone e digite o código recebido.
4. Depois de logado, crie um equipamento de teste, tire uma foto, assine e
   finalize — confira se aparece certinho no **Exportar PDF**.
5. Peça para outro técnico se cadastrar em outro celular e veja se ele
   enxerga a mesma lista de equipamentos (é o Firestore compartilhando os
   dados entre todos).

## Como cada técnico é identificado

Cada ficha guarda, junto com cada alteração, quem estava logado quando fez
aquilo (nome e sobrenome), e no fim mostra quem criou e quem finalizou a
ficha, com hora de cada coisa. A assinatura desenhada na tela e o nome do
perfil logado aparecem no PDF final.

## Se algo não funcionar

- **"Firebase: Error (auth/...)"** na tela de login → confira se copiou
  certinho os valores em `firebase-config.js`.
- **Login funciona, mas a lista de equipamentos não carrega** → confira as
  regras do Firestore (passo 4) e se o Firestore foi mesmo criado.
- **Fotos não aparecem** → confira as regras do Storage (passo 5) e se o
  Storage foi ativado.
- **Código por e-mail não chega** → confira Service ID/Template ID/Public
  Key do EmailJS e veja a caixa de spam.
- **"Função na nuvem indisponível" ao trocar senha por telefone** → a
  Cloud Function não foi publicada ainda (passo 8), ou o telefone digitado
  não é exatamente igual ao que está salvo no cadastro.
