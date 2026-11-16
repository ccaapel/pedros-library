# Biblioteca do Pedro

App pessoal para guardar, ler, anotar, ouvir e revisar o que chamou atenção no dia.

- `index.html`: o app inteiro em um arquivo.
- `build-pages.js`: gera a pasta `docs/` (GitHub Pages) com manifest, ícones e service worker. Rodar `node build-pages.js` depois de mudar o `index.html`.
- Nesta versão os itens ficam guardados só no aparelho (localStorage). Nada é enviado a servidor.

Regras internas:
- Revisão espaçada: cada item volta 1, 7 e 30 dias depois de guardado.
- Tipo detectado pelo endereço do link ou pelo formato do texto.
