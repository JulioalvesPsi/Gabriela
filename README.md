# Gabriela

Aplicativo de treino de leitura com registro de acertos, erros e tempo de resposta.

## Recursos

* palavras em caixa alta ou baixa
* medição silenciosa do tempo de resposta
* índice de dificuldade que combina tempo relativo e erros
* identificação de padrões ortográficos
* seleção adaptativa de novas palavras
* banco local de até 2.000 palavras
* histórico local com backup
* sincronização opcional com Supabase
* mesma conta em vários aparelhos

## Configurar Supabase

1. Abra `supabase/schema.sql` no SQL Editor do seu projeto Supabase e execute o conteúdo.
2. No aplicativo, abra `Responsável` e preencha a URL do projeto e a chave pública anon.
3. Crie uma conta ou entre com o mesmo e mail e senha nos aparelhos que devem compartilhar o histórico.
4. A partir daí, palavras, tentativas, tempos e configurações são sincronizados.

O aplicativo mantém uma cópia local. Se a internet cair, as respostas continuam sendo registradas e são enviadas na próxima sincronização.
