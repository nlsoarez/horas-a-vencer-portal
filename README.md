# Portal de Controle de Horas a Vencer

Portal web para processamento e análise de planilhas de horas a vencer de funcionários.

## 🚀 Funcionalidades

- **Upload de Planilhas CSV**: Suporte a arquivos CSV com separador ponto-e-vírgula
- **Processamento Automático**: Agrupamento por funcionário e cálculo de saldos
- **Sistema de Alertas**:
  - Crítico: < 7 dias para vencer
  - Alerta: 7-30 dias para vencer
  - Normal: > 30 dias para vencer
- **Filtros Avançados**:
  - Por status (Ativo/Férias)
  - Por dias a vencer
  - Busca por nome
- **Exportação de Dados**: Resumo em CSV
- **Visualização Detalhada**: Detalhes individuais por funcionário

## 📊 Estrutura do Arquivo CSV

O arquivo CSV deve conter as seguintes colunas:
- FUNC_ID
- NOME
- EMPRESA_COD
- CARGO
- STATUS
- DESCRICAO
- BHMV_DAT_MOVTO
- DATA_VENC
- SALDO (formato HH:MM ou decimal)
- A_VENCER_EM_DIAS

## 🛠️ Como Usar

### Online (GitHub Pages)
1. Acesse: `https://seu-usuario.github.io/horas-a-vencer-portal`
2. Faça upload do arquivo CSV
3. Visualize os resultados

### Localmente
1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/horas-a-vencer-portal.git
