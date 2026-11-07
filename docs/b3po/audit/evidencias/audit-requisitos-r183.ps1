#!/usr/bin/env pwsh
# Auditoria de requisitos do GOAL contra o codigo (rodada 183).
#
# O metodo que funcionou na r181: em vez de perguntar "o que eu construi?", perguntar "o que o documento pede e
# eu nao construi?". Cada linha abaixo e uma frase do GOAL traduzida para um padrao de busca no codigo.

$repo = "D:\IA-Workspace\Deepseek\projects\C-3PO BOT"
$alvos = @(
  "$repo\apps\desktop\electron",
  "$repo\apps\desktop\src\app",
  "$repo\apps\desktop\src\api"
)

$requisitos = @(
  @{ sec = '14'; nome = 'lotes';          pad = 'lote|batch|lot_number' },
  @{ sec = '14'; nome = 'validade';       pad = 'validade|expiry|expires_at|shelf_life' },
  @{ sec = '14'; nome = 'transferencias'; pad = 'transferencia|transfer' },
  @{ sec = '14'; nome = 'inventarios';    pad = 'inventario|inventory_count|stocktake' },
  @{ sec = '14'; nome = 'reservas';       pad = 'reserva|reserved|reservation' },
  @{ sec = '14'; nome = 'ajustes';        pad = 'ajuste|adjustment' },
  @{ sec = '14'; nome = 'alertas';        pad = 'alerta|low_stock|estoque_baixo' },
  @{ sec = '15'; nome = 'cotacao';        pad = 'cotacao|quotation|quote' },
  @{ sec = '16'; nome = 'desconto';       pad = 'discount_cents|desconto' },
  @{ sec = '16'; nome = 'comissao';       pad = 'comissao|commission' },
  @{ sec = '16'; nome = 'cancelamento';   pad = 'cancel' },
  @{ sec = '16'; nome = 'devolucao';      pad = 'devolucao|return' },
  @{ sec = '16'; nome = 'recibo';         pad = 'recibo|receipt' },
  @{ sec = '17'; nome = 'reagendamento';  pad = 'reagend|reschedul' },
  @{ sec = '17'; nome = 'lembretes';      pad = 'lembrete|reminder' },
  @{ sec = '17'; nome = 'bloqueios';      pad = 'bloqueio|block' },
  @{ sec = '18'; nome = 'conciliacao';    pad = 'conciliacao|reconcil' },
  @{ sec = '18'; nome = 'categorias';     pad = 'categoria|categor' },
  @{ sec = '18'; nome = 'centro_custo';   pad = 'centro_de_custo|cost_center' },
  @{ sec = '19'; nome = 'onboarding';     pad = 'onboarding' },
  @{ sec = '19'; nome = 'offboarding';    pad = 'offboarding' },
  @{ sec = '19'; nome = 'treinamentos';   pad = 'treinamento|training' },
  @{ sec = '19'; nome = 'escalas';        pad = 'escala|shift|roster' },
  @{ sec = '19'; nome = 'ferias';         pad = 'ferias|vacation' },
  @{ sec = '20'; nome = 'calendario_edit';pad = 'calendario_editorial|editorial' },
  @{ sec = '20'; nome = 'campanhas';      pad = 'campanha|campaign' },
  @{ sec = '20'; nome = 'segmentacao';    pad = 'segmento|segment' },
  @{ sec = '21'; nome = 'tickets';        pad = 'ticket' },
  @{ sec = '21'; nome = 'sla';            pad = 'sla|prazo_sla' },
  @{ sec = '21'; nome = 'filas';          pad = 'fila|queue' },
  @{ sec = '21'; nome = 'satisfacao';     pad = 'satisfacao|satisfaction|nps' },
  @{ sec = '12'; nome = 'consentimento';  pad = 'consentimento|consent' },
  @{ sec = '12'; nome = 'importacao';     pad = 'import.*csv|importar' },
  @{ sec = '12'; nome = 'exportacao';     pad = 'export.*csv|exportar' },
  @{ sec = '23'; nome = 'audit_log';      pad = 'audit_log|auditoria' },
  @{ sec = '23'; nome = 'idempotencia';   pad = 'idempot|ref:' },
  @{ sec = '23'; nome = 'rollback';       pad = 'rollback' },
  @{ sec = '26'; nome = 'estado_offline'; pad = 'offline' },
  @{ sec = '26'; nome = 'estado_loading'; pad = 'loading|carregando' },
  @{ sec = '26'; nome = 'estado_vazio';   pad = 'vazio|empty' }
)

$presentes = @()
$ausentes = @()

foreach ($req in $requisitos) {
  $achou = $false
  foreach ($dir in $alvos) {
    if (-not (Test-Path $dir)) { continue }
    $hit = Get-ChildItem $dir -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notmatch '\.test\.' } |
      Select-String -Pattern $req.pad -List -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($hit) { $achou = $true; break }
  }
  if ($achou) { $presentes += $req } else { $ausentes += $req }
}

Write-Output "=== PRESENTES ($($presentes.Count)) ==="
foreach ($p in $presentes) { Write-Output ("  sec " + $p.sec + "  " + $p.nome) }

Write-Output ""
Write-Output "=== AUSENTES ($($ausentes.Count)) ==="
foreach ($a in $ausentes) { Write-Output ("  sec " + $a.sec + "  " + $a.nome + "   (padrao: " + $a.pad + ")") }
