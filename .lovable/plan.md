# Bug fix: botão "Novo Indicador" em Indicadores Franquia aponta para `/franquias`

## Problema

Em `src/components/app/indicadores-page.tsx`, quando `escopo === "franquia"`, o botão "Novo Indicador" navega para `/franquias` (listagem de empresas/franquias) em vez de iniciar o fluxo de criação de indicador de franquia. A rota correta de criação (`/franquias/$id/indicadores/novo`) já existe, mas exige um `id` de franquia que a listagem global não tem no contexto.

## Solução

Implementar a **Opção A**: abrir um dialog de seleção de franquia ao clicar em "Novo Indicador" no modo franquia. Ao selecionar uma franquia, navegar para `/franquias/<id>/indicadores/novo` com o `id` correto.

## Alterações propostas

### 1. Criar `SelecionarFranquiaDialog`

Novo arquivo: `src/components/app/selecionar-franquia-dialog.tsx`

Componente reutilizável que exibe:
- Título: "Selecionar franquia"
- Campo de busca por nome ou código
- Lista de franquias ordenadas por nome (apenas `entity_type === "franquia"`, usando `isFranquia`)
- Ao clicar em uma franquia, chama `onSelect(franchiseId)` e fecha o dialog

Props:
```ts
interface SelecionarFranquiaDialogProps {
  trigger: React.ReactNode;
  onSelect: (franchiseId: string) => void;
}
```

Usar componentes de UI já existentes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`, `Input`, `Button`, `ScrollArea` (se disponível; senão `div` com scroll).

### 2. Atualizar `IndicadoresPage`

Arquivo: `src/components/app/indicadores-page.tsx`

- Adicionar import de `useNavigate` do `@tanstack/react-router`.
- Importar `SelecionarFranquiaDialog`.
- Substituir o bloco do botão no modo franquia (linhas 80–84) por:

```tsx
{escopo === "franquia" ? (
  <SelecionarFranquiaDialog
    trigger={
      <Button>
        <Plus className="size-4" />Novo indicador
      </Button>
    }
    onSelect={(franchiseId) =>
      navigate({ to: "/franquias/$id/indicadores/novo", params: { id: franchiseId } })
    }
  />
) : (
  <Button asChild>
    <Link to="/indicadores/novo"><Plus className="size-4" />Novo indicador</Link>
  </Button>
)}
```

- Adicionar `const navigate = useNavigate();` no corpo do componente.

### 3. Manter fluxo existente em `/franquias/$id`

Não alterar `src/routes/_authenticated/franquias.$id.index.tsx`. O botão "Novo Indicador" dentro da página de detalhe da franquia continua apontando diretamente para `/franquias/$id/indicadores/novo`.

### 4. Verificação

Após a implementação, executar typecheck/build e verificar no preview:
- Clicar em "Novo Indicador" em `/indicadores-franquia` abre o dialog.
- Selecionar uma franquia navega para `/franquias/<id>/indicadores/novo`.
- O formulário `FranquiaIndicadorForm` carrega com `franchiseId` correto via `useParams()`.
- A busca no dialog filtra franquias por nome/código.
- O botão interno em `/indicadores` continua indo para `/indicadores/novo`.
- A linha `to="/franquias"` não existe mais no botão do modo franquia.
