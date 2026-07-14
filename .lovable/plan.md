## Plano: Renomear botão de envio em Lançamentos

### Alteração proposta
Na tela de criação de lançamentos (`src/routes/_authenticated/lancamentos.novo.tsx`), renomear o botão principal:

- **De:** `Enviar para aprovação`
- **Para:** `Cadastrar`

### Detalhe técnico
Atualmente o botão possui duas variações de texto:
```text
{ind?.requires_approval ? "Enviar para aprovação" : "Confirmar lançamento"}
```

A mudança afeta apenas a primeira variação, deixando:
```text
{ind?.requires_approval ? "Cadastrar" : "Confirmar lançamento"}
```

### Verificação
- `bun run build` passar.
- Abrir `/lancamentos/novo`, selecionar um indicador que exige aprovação e confirmar que o botão exibe **Cadastrar**.

### Dúvida rápida
Deseja que a segunda variação (`Confirmar lançamento`) também vire **Cadastrar**, ou mantém diferenciada?