# Plano de melhorias e seguranca do historico

## Estado atual

- Fork atualizado com `upstream/main`.
- Conflitos resolvidos sem remover as otimizacoes locais de cold boot, bulk load, lazy layout e prewarm.
- Mudancas estao prontas para commit local.
- Nao publicar nem testar instalacao nova sem backup do historico salvo.

## Backup obrigatorio antes de novos testes

O historico do Copyous pode estar em SQLite ou JSON. Quando `database-location` esta vazio, o padrao fica em:

- `${XDG_DATA_HOME:-$HOME/.local/share}/copyous@boerdereinar.dev/clipboard.db`
- `${XDG_DATA_HOME:-$HOME/.local/share}/copyous@boerdereinar.dev/clipboard.json`

Antes de rodar `make install`, `make launch`, trocar backend de banco, limpar historico ou testar migracoes:

```bash
BACKUP="$HOME/backup-copyous-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/copyous@boerdereinar.dev"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/copyous@boerdereinar.dev"

cp -a "$DATA_DIR" "$BACKUP/data" 2>/dev/null || true
cp -a "$CONFIG_DIR" "$BACKUP/config" 2>/dev/null || true
dconf dump /org/gnome/shell/extensions/copyous/ > "$BACKUP/dconf-copyous.ini"
```

Verificar se ha caminho customizado de banco:

```bash
gsettings get org.gnome.shell.extensions.copyous database-location
gsettings get org.gnome.shell.extensions.copyous database-backend
```

Se `database-location` retornar um caminho real, copiar esse arquivo tambem:

```bash
cp -a "/caminho/customizado/clipboard.db" "$BACKUP/"
cp -a "/caminho/customizado/clipboard.json" "$BACKUP/"
```

Conferencia minima do backup:

```bash
find "$BACKUP" -maxdepth 3 -type f -print
```

Regra: se o backup nao contem `clipboard.db`, `clipboard.json` ou um caminho customizado confirmado, parar e investigar antes de continuar.

## Plano de melhorias

1. Fechar o merge atual
   - Commitar o merge local.
   - Rodar `tsc`, `eslint`, `prettier`, `make check-pot` e `make check-po`.
   - Testar manualmente abrir, fechar, pesquisar, copiar, colar e reabrir rapido.

2. Proteger o historico
   - Nunca alterar backend sem backup.
   - Testar migracao entre SQLite e JSON usando copia do banco.
   - Confirmar que `clear-history` nao afeta itens pinned/tagged indevidamente.

3. Corrigir riscos pos-merge
   - Garantir que `_closing` volta para `false` se o dialogo for destruido durante animacao.
   - Cancelar callbacks idle pendentes em `disable()`.
   - Validar `preWarm()` com historico grande.

4. Otimizar carregamento inicial
   - Medir tempo de `enable()` e `initEntryTracker()`.
   - Carregar historico em lotes se houver muitos itens.
   - Evitar previews pesados antes da primeira abertura real.

5. Otimizar busca
   - Cachear texto pesquisavel por item.
   - Invalidar cache apenas em `content`, `title`, `metadata`, `type`, `tag` e `pinned`.
   - Evitar reprocessar todos os itens quando a busca ficar apenas mais restritiva.

6. Reduzir vazamentos
   - Auditar `connect()` sem desconexao em itens, menus e banco.
   - Garantir que `loadItems()` nao duplica sinais.
   - Verificar destruicao de itens removidos.

7. Testar UI e edge cases
   - Orientacao vertical e horizontal.
   - Scrollbar ligada/desligada.
   - `show-at-pointer` e `show-at-cursor`.
   - RTL.
   - Busca por titulo customizado.
   - Filtros pinned, tagged e tipo.
   - Abrir durante animacao de fechamento.

8. Automatizar validacao
   - Criar `make validate`.
   - Incluir typecheck, lint, prettier, check-pot e check-po.
   - Documentar checklist manual antes de release.

9. Performance futura
   - Adicionar logs opcionais de tempo em modo debug.
   - Medir cold boot, primeira abertura, busca com 500 itens e limpeza de historico.
   - Manter apenas otimizacoes com ganho mensuravel.

## Ordem recomendada

1. Backup local.
2. Commit do merge atual.
3. Validacao estatica.
4. Teste manual com backup ja feito.
5. Correcoes de `_closing`, idle callbacks e destruicao.
6. Otimizacoes de busca e carregamento.
7. Automacao final.
