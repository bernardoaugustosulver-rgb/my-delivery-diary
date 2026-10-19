# My Delivery Diary

Prompt 1: Quero criar um aplicativo de controle de entregas para motoboys. A tela principal deve ter abas (Tabs) na parte superior, onde cada aba representa um "Estabelecimento" (Ex: Batisti, American, etc.). Dentro de cada aba, deve haver uma lista de bairros fixos. Cada bairro deve exibir: o nome do bairro, o valor fixo da entrega, um contador numérico que começa em 0, e botões de "+" e "-" para alterar a quantidade de entregas

feitas. Adicione também um botão de "Resetar Semana" que zera todos os contadores. Deixe o visual moderno, responsivo para celular e em modo escuro (dark mode com azul abas branca letras pretas ).

Prompt 2: Agora, configure o banco de dados (pode usar Supabase ou localStorage para persistência). Preciso de uma tela de configurações oculta ou um modal onde eu possa cadastrar os Estabelecimentos e, dentro de cada um, os Bairros com seus respectivos Valores Fixos. Se eu alterar o valor de um bairro nessa configuração, ele deve atualizar na tela principal de contadores.

Prompt 3: Adicione a lógica de Resumo Diário. Toda vez que o contador de um bairro for maior que zero, o app deve registrar essa quantidade vinculada à data atual (DD/MM). Em cada aba de estabelecimento, adicione um botão chamado "Resumo". Ao clicar nele, abra uma tela ou modal que mostre o histórico separado por dia. Exemplo de exibição:

01/10: 4x Ilha da Figueira (R$ 40,00), 2x Centro (R$ 24,00) - Total do dia: R$ 64,00 02/10: 6x Ilha da Figueira (R$ 60,00)

Prompt 4: Ao lado de cada bairro na lista, adicione um botão de "Observações" (ícone de papel ou chat). Quando eu clicar nele, deve abrir uma janela pop-up (modal) com um campo de texto para eu escrever notas sobre aquele bairro no dia atual (ex: "Ilha da Figueira: +R$ 5 de bônus" ou "+R$ 5 de gorjeta"). Esse texto deve ficar salvo e aparecer junto ao Resumo do respectivo dia.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://my-delivery-diary.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/abf34ef8-bb4a-4436-9e76-a472248b5731).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
