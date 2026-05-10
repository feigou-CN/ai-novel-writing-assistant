<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Link } from '@element-plus/icons-vue'
import { useMaterialStore } from '@/stores/materialStore'
import { useNovelStore } from '@/stores/novelStore'
import type { Character, CharacterRelation } from '@/types'

const materialStore = useMaterialStore()
const novelStore = useNovelStore()

// === State ===
const canvasRef = ref<HTMLDivElement | null>(null)
const canvasWidth = ref(800)
const canvasHeight = ref(600)
const selectedCharId = ref<string | null>(null)
const connectMode = ref(false)
const sourceCharId = ref<string | null>(null)
const hoveredEdgeId = ref<string | null>(null)

// Character dialog
const dialogVisible = ref(false)
const editingChar = ref<Partial<Character>>({})

// Relation dialog
const relationDialogVisible = ref(false)
const editingRelationId = ref<string | undefined>()
const relationSourceId = ref('')
const relationTargetId = ref('')
const relationLabel = ref('')
const relationType = ref<'directed' | 'bidirectional'>('directed')

// Drag state
const draggingCharId = ref<string | null>(null)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)
const dragStartX = ref(0)
const dragStartY = ref(0)
const wasDragged = ref(false)
const DRAG_THRESHOLD = 5

// Panning state
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const wasPanning = ref(false)
const panStartX = ref(0)
const panStartY = ref(0)
const panStartPanX = ref(0)
const panStartPanY = ref(0)
const showNavigator = ref(true)

const CARD_W = 150
const CARD_H = 72
const VIRTUAL_SIZE = 3000

// === Edge computation ===

function edgePoint(
  cx: number, cy: number,
  ox: number, oy: number,
  hw: number, hh: number,
): { x: number; y: number } {
  const dx = ox - cx
  const dy = oy - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  if (absDx * hh > absDy * hw) {
    const s = hw / absDx
    return { x: cx + (dx > 0 ? hw : -hw), y: cy + dy * s }
  } else {
    const s = hh / absDy
    return { x: cx + dx * s, y: cy + (dy > 0 ? hh : -hh) }
  }
}

interface EdgeData {
  id: string
  relation: CharacterRelation
  x1: number; y1: number; x2: number; y2: number
  mx: number; my: number
  label: string
  markerEnd: string
  markerStart: string
}

const edges = computed(() => {
  const result: EdgeData[] = []
  for (const rel of materialStore.characterRelations) {
    const src = materialStore.characters.find(c => c.id === rel.sourceId)
    const tgt = materialStore.characters.find(c => c.id === rel.targetId)
    if (!src || !tgt || src.positionX === undefined || src.positionY === undefined || tgt.positionX === undefined || tgt.positionY === undefined) continue

    const sx = src.positionX + CARD_W / 2
    const sy = src.positionY + CARD_H / 2
    const tx = tgt.positionX + CARD_W / 2
    const ty = tgt.positionY + CARD_H / 2

    const p1 = edgePoint(sx, sy, tx, ty, CARD_W / 2, CARD_H / 2)
    const p2 = edgePoint(tx, ty, sx, sy, CARD_W / 2, CARD_H / 2)

    result.push({
      id: rel.id,
      relation: rel,
      x1: p1.x, y1: p1.y,
      x2: p2.x, y2: p2.y,
      mx: (p1.x + p2.x) / 2,
      my: (p1.y + p2.y) / 2,
      label: rel.label,
      markerEnd: rel.type === 'directed' || rel.type === 'bidirectional' ? 'url(#arrow-end)' : '',
      markerStart: rel.type === 'bidirectional' ? 'url(#arrow-start)' : '',
    })
  }
  return result
})

const hasPositionedChars = computed(() =>
  materialStore.characters.some(c => c.positionX !== undefined),
)

// === Auto-layout (initial load only) ===

async function autoLayout() {
  const chars = materialStore.characters
  if (chars.length === 0 || hasPositionedChars.value) return

  const cx = VIRTUAL_SIZE / 2
  const cy = VIRTUAL_SIZE / 2
  const radius = VIRTUAL_SIZE / 2 - 200

  if (radius < 60) return

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (!char) continue
    const angle = (2 * Math.PI * i) / chars.length - Math.PI / 2
    char.positionX = Math.round(cx + radius * Math.cos(angle) - CARD_W / 2)
    char.positionY = Math.round(cy + radius * Math.sin(angle) - CARD_H / 2)
  }

  // Persist to IndexedDB so positions survive refresh
  const novelId = novelStore.currentNovel?.id
  if (novelId) {
    for (const char of chars) {
      await materialStore.saveCharacter({ ...char, novelId })
    }
  }
}

function assignPosition(offset = 0) {
  const cx = VIRTUAL_SIZE / 2
  const cy = VIRTUAL_SIZE / 2
  const positionedCount = materialStore.characters.filter(c => c.positionX !== undefined).length
  const total = Math.max(positionedCount + 1, 3)
  const idx = positionedCount + offset
  const radius = VIRTUAL_SIZE / 2 - 200
  const r = Math.max(radius, 80)
  const angle = (2 * Math.PI * idx) / total - Math.PI / 2
  return {
    positionX: Math.round(cx + r * Math.cos(angle) - CARD_W / 2),
    positionY: Math.round(cy + r * Math.sin(angle) - CARD_H / 2),
  }
}

// === Watch: auto-assign positions to newly added characters (e.g. from AI) ===

watch(() => materialStore.characters.length, async () => {
  const novelId = novelStore.currentNovel?.id
  if (!novelId) return
  const unpositioned = materialStore.characters.filter(
    c => c.positionX === undefined || c.positionY === undefined,
  )
  if (unpositioned.length === 0) return

  // Assign positions synchronously before any await, so Vue renders with them set
  let offset = 0
  for (const char of unpositioned) {
    const pos = assignPosition(offset++)
    char.positionX = pos.positionX
    char.positionY = pos.positionY
  }
  // Persist to IndexedDB
  for (const char of unpositioned) {
    await materialStore.saveCharacter({ ...char, novelId })
  }
})

// === Character CRUD ===

function openCreate() {
  editingChar.value = {
    name: '', gender: '', age: '', personality: '',
    appearance: '', background: '', relationships: '', notes: '',
    ...assignPosition(),
  }
  connectMode.value = false
  dialogVisible.value = true
}

function openEdit(char: Character) {
  editingChar.value = { ...char }
  dialogVisible.value = true
}

async function save() {
  if (!editingChar.value.name?.trim()) return
  const novelId = novelStore.currentNovel?.id
  if (!novelId) return

  await materialStore.saveCharacter({
    ...editingChar.value as Omit<Character, 'id' | 'novelId'>,
    id: editingChar.value.id,
    novelId,
  })
  dialogVisible.value = false
  ElMessage.success('已保存')
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm(
      '确定删除该人物吗？关联的关系也将一并删除。', '确认', { type: 'warning' },
    )
    for (const rel of materialStore.characterRelations) {
      if (rel.sourceId === id || rel.targetId === id) {
        await materialStore.deleteCharacterRelation(rel.id)
      }
    }
    await materialStore.deleteCharacter(id)
    if (selectedCharId.value === id) selectedCharId.value = null
    ElMessage.success('已删除')
  } catch { /* cancel */ }
}

// === Node / Canvas interaction ===

function onNodeClick(char: Character) {
  if (wasDragged.value) {
    wasDragged.value = false
    return
  }
  if (connectMode.value) {
    if (!sourceCharId.value) {
      sourceCharId.value = char.id
      selectedCharId.value = char.id
    } else if (sourceCharId.value === char.id) {
      sourceCharId.value = null
      selectedCharId.value = null
    } else {
      openCreateRelation(sourceCharId.value, char.id)
    }
    return
  }
  selectedCharId.value = char.id
  openEdit(char)
}

function onCanvasClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.char-node, .edge-group, .el-dialog, .el-overlay, .char-navigator')) return
  if (wasPanning.value) {
    wasPanning.value = false
    return
  }
  if (!connectMode.value) {
    selectedCharId.value = null
  }
}

function onCanvasMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.char-node, .edge-group, .el-dialog, .el-overlay, .char-navigator')) return
  if (connectMode.value) return
  isPanning.value = true
  wasPanning.value = false
  panStartX.value = e.clientX
  panStartY.value = e.clientY
  panStartPanX.value = panX.value
  panStartPanY.value = panY.value
}

function focusOnCharacter(char: Character) {
  if (char.positionX === undefined || char.positionY === undefined) return
  selectedCharId.value = char.id
  const viewW = canvasRef.value?.clientWidth || canvasWidth.value
  const viewH = canvasRef.value?.clientHeight || canvasHeight.value
  panX.value = viewW / 2 - (char.positionX + CARD_W / 2)
  panY.value = viewH / 2 - (char.positionY + CARD_H / 2)
}

// === Relation helpers ===

function openCreateRelation(sourceId: string, targetId: string) {
  editingRelationId.value = undefined
  relationSourceId.value = sourceId
  relationTargetId.value = targetId
  relationLabel.value = ''
  relationType.value = 'directed'
  relationDialogVisible.value = true
}

function openEditRelation(rel: CharacterRelation) {
  editingRelationId.value = rel.id
  relationSourceId.value = rel.sourceId
  relationTargetId.value = rel.targetId
  relationLabel.value = rel.label
  relationType.value = rel.type
  relationDialogVisible.value = true
}

function getCharName(id: string): string {
  const char = materialStore.characters.find(c => c.id === id)
  return char?.name || '未知'
}

async function saveRelation() {
  if (!relationLabel.value.trim()) {
    ElMessage.warning('请输入关系描述')
    return
  }
  const novelId = novelStore.currentNovel?.id
  if (!novelId) return

  await materialStore.saveCharacterRelation({
    id: editingRelationId.value,
    novelId,
    sourceId: relationSourceId.value,
    targetId: relationTargetId.value,
    label: relationLabel.value.trim(),
    type: relationType.value,
  })

  relationDialogVisible.value = false
  sourceCharId.value = null
  selectedCharId.value = null
  ElMessage.success('关系已保存')
}

async function removeRelation(id: string) {
  try {
    await ElMessageBox.confirm('确定删除该关系吗？', '确认', { type: 'warning' })
    await materialStore.deleteCharacterRelation(id)
    ElMessage.success('关系已删除')
  } catch { /* cancel */ }
}

// === Dragging ===

function onNodeMouseDown(e: MouseEvent, char: Character) {
  if (connectMode.value) return
  draggingCharId.value = char.id
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  wasDragged.value = false
  dragOffsetX.value = e.clientX - (char.positionX || 0)
  dragOffsetY.value = e.clientY - (char.positionY || 0)
  selectedCharId.value = char.id
}

function onMouseMove(e: MouseEvent) {
  // Canvas panning
  if (isPanning.value) {
    const dx = Math.abs(e.clientX - panStartX.value)
    const dy = Math.abs(e.clientY - panStartY.value)
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      wasPanning.value = true
    }
    if (!wasPanning.value) return
    panX.value = panStartPanX.value + (e.clientX - panStartX.value)
    panY.value = panStartPanY.value + (e.clientY - panStartY.value)
    return
  }

  // Node dragging
  if (!draggingCharId.value) return
  if (!wasDragged.value) {
    const dx = Math.abs(e.clientX - dragStartX.value)
    const dy = Math.abs(e.clientY - dragStartY.value)
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      wasDragged.value = true
    }
  }
  if (!wasDragged.value) return
  const char = materialStore.characters.find(c => c.id === draggingCharId.value)
  if (!char) return
  // Keep cards within a generous canvas area (no upper bound — panning handles overflow)
  // Only prevent dragging above/left of origin
  char.positionX = Math.max(0, e.clientX - dragOffsetX.value)
  char.positionY = Math.max(0, e.clientY - dragOffsetY.value)
}

async function onMouseUp() {
  // Stop panning
  if (isPanning.value) {
    isPanning.value = false
    return
  }

  // Finish node drag → save position
  if (!draggingCharId.value) return
  const charId = draggingCharId.value
  draggingCharId.value = null
  const char = materialStore.characters.find(c => c.id === charId)
  if (!char) return
  const novelId = novelStore.currentNovel?.id
  if (!novelId) return
  await materialStore.saveCharacter({
    ...char,
    novelId,
  })
}

// === Canvas resize ===

function updateCanvasSize() {
  if (canvasRef.value) {
    canvasWidth.value = canvasRef.value.clientWidth
    canvasHeight.value = canvasRef.value.clientHeight
  }
}

// === Lifecycle ===

onMounted(() => {
  updateCanvasSize()
  // Center the virtual canvas in the viewport
  panX.value = (canvasWidth.value - VIRTUAL_SIZE) / 2
  panY.value = (canvasHeight.value - VIRTUAL_SIZE) / 2
  window.addEventListener('resize', updateCanvasSize)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  nextTick(() => { autoLayout() })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div class="character-graph">
    <!-- Toolbar -->
    <div class="editor-toolbar">
      <span class="section-title">
        人物关系图
        <span class="char-count">（{{ materialStore.characters.length }}人）</span>
      </span>
      <div class="toolbar-actions">
        <el-button
          size="small"
          :type="connectMode ? 'warning' : 'default'"
          :icon="Link"
          @click="connectMode = !connectMode; sourceCharId = null; selectedCharId = null"
        >
          {{ connectMode ? '取消连线' : '连线' }}
        </el-button>
        <el-button size="small" type="primary" :icon="Plus" @click="openCreate">
          添加人物
        </el-button>
      </div>
    </div>

    <!-- Connection mode hint -->
    <div v-if="connectMode" class="connect-hint">
      {{ sourceCharId ? `已选「${getCharName(sourceCharId)}」，请点击目标人物` : '请点击第一个人物建立连线' }}
    </div>

    <!-- Graph Canvas -->
    <div
      v-if="materialStore.characters.length > 0"
      ref="canvasRef"
      class="graph-canvas"
      :class="{ 'is-panning': isPanning, 'is-connect-mode': connectMode }"
      @mousedown="onCanvasMouseDown"
      @click="onCanvasClick"
    >
      <!-- Transform wrapper (panning) -->
      <div
        class="canvas-transform"
        :style="{ transform: `translate(${panX}px, ${panY}px)` }"
      >
        <!-- SVG overlay -->
        <svg
          class="graph-svg"
          :width="canvasWidth"
          :height="canvasHeight"
          overflow="visible"
        >
          <defs>
            <!-- Grid pattern (normal) -->
            <pattern id="grid-normal" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" class="grid-line" stroke-width="0.5"/>
            </pattern>
            <!-- Grid pattern (connect mode, yellow) -->
            <pattern id="grid-connect" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--color-warning)" stroke-width="0.5" stroke-opacity="0.8"/>
            </pattern>
            <marker
              id="arrow-end"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-muted)" />
            </marker>
            <marker
              id="arrow-start"
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="10 0, 0 3.5, 10 7" fill="var(--text-muted)" />
            </marker>
          </defs>

          <!-- Inside background (virtual canvas fill) -->
          <rect x="0" y="0" width="3000" height="3000" class="inside-bg" />
          <!-- Inside grid overlay -->
          <rect x="0" y="0" width="3000" height="3000" :fill="connectMode ? 'url(#grid-connect)' : 'url(#grid-normal)'" class="grid-overlay" />
          <!-- Canvas boundary (dashed border separating inside from outside) -->
          <rect x="0" y="0" width="3000" height="3000" class="canvas-boundary" :class="{ 'is-connect-mode': connectMode }" />

          <!-- Edges -->
          <g
            v-for="edge in edges"
            :key="edge.id"
            class="edge-group"
            :class="{ 'is-hovered': hoveredEdgeId === edge.id }"
            @mouseenter="hoveredEdgeId = edge.id"
            @mouseleave="hoveredEdgeId = null"
            @click.stop="openEditRelation(edge.relation)"
          >
            <line
              :x1="edge.x1" :y1="edge.y1"
              :x2="edge.x2" :y2="edge.y2"
              stroke="transparent"
              stroke-width="16"
              class="edge-click-target"
            />
            <line
              :x1="edge.x1" :y1="edge.y1"
              :x2="edge.x2" :y2="edge.y2"
              :marker-end="edge.markerEnd"
              :marker-start="edge.markerStart"
              class="edge-line"
              stroke-width="2"
            />
            <g :transform="`translate(${edge.mx}, ${edge.my})`">
              <rect
                :x="-(edge.label.length * 7 + 8) / 2"
                :y="-11"
                :width="edge.label.length * 7 + 8"
                height="22"
                rx="4"
                class="edge-label-bg"
              />
              <text
                text-anchor="middle"
                dy="4"
                font-size="11"
                class="edge-label-text"
              >{{ edge.label }}</text>
            </g>
          </g>
        </svg>

        <!-- Character Nodes -->
        <div
          v-for="char in materialStore.characters"
          :key="char.id"
          class="char-node"
          :class="{
            'is-selected': selectedCharId === char.id,
            'is-connect-source': sourceCharId === char.id,
            'is-connect-target': connectMode && sourceCharId && sourceCharId !== char.id,
            'is-dragging': draggingCharId === char.id,
            'is-connect-mode': connectMode,
          }"
          :style="{
            left: char.positionX + 'px',
            top: char.positionY + 'px',
            width: CARD_W + 'px',
          }"
          @mousedown.stop="onNodeMouseDown($event, char)"
          @click.stop="onNodeClick(char)"
        >
          <div class="char-node-name">{{ char.name }}</div>
          <div v-if="char.gender" class="char-node-meta">{{ char.gender }}{{ char.age ? ' · ' + char.age : '' }}</div>
          <div v-if="char.personality" class="char-node-personality">{{ char.personality }}</div>
          <el-button
            text
            size="small"
            type="danger"
            class="node-delete-btn"
            @click.stop="remove(char.id)"
          >
            删除
          </el-button>
        </div>
      </div>

      <!-- Character Navigator -->
      <div class="char-navigator" :class="{ collapsed: !showNavigator }">
        <div class="nav-header" @click="showNavigator = !showNavigator">
          <span>人物 ({{ materialStore.characters.length }})</span>
          <span class="nav-arrow">{{ showNavigator ? '▾' : '▸' }}</span>
        </div>
        <div v-if="showNavigator" class="nav-body">
          <div
            v-for="char in materialStore.characters"
            :key="char.id"
            class="nav-item"
            :class="{ active: selectedCharId === char.id }"
            @click.stop="focusOnCharacter(char)"
          >
            {{ char.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="materialStore.characters.length === 0" class="empty-hint">
      还没有人物，点击「添加人物」开始创建
    </div>
  </div>

  <!-- Character Edit Dialog -->
  <el-dialog
    :model-value="dialogVisible"
    title="人物设定"
    width="600px"
    @close="dialogVisible = false"
  >
    <el-form :model="editingChar" label-width="80px" label-position="top">
      <el-form-item label="姓名" required>
        <el-input v-model="editingChar.name" placeholder="人物姓名" />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="性别">
            <el-input v-model="editingChar.gender" placeholder="男/女/其他" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="年龄">
            <el-input v-model="editingChar.age" placeholder="如：25岁" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="性格特点">
        <el-input v-model="editingChar.personality" type="textarea" :rows="2" placeholder="描述性格特点" />
      </el-form-item>
      <el-form-item label="外貌描述">
        <el-input v-model="editingChar.appearance" type="textarea" :rows="2" placeholder="外貌特征" />
      </el-form-item>
      <el-form-item label="背景故事">
        <el-input v-model="editingChar.background" type="textarea" :rows="3" placeholder="背景经历" />
      </el-form-item>
      <el-form-item label="人际关系">
        <el-input v-model="editingChar.relationships" type="textarea" :rows="2" placeholder="与其他角色的关系" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="editingChar.notes" type="textarea" :rows="2" placeholder="其他补充说明" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save" :disabled="!editingChar.name?.trim()">保存</el-button>
    </template>
  </el-dialog>

  <!-- Relation Dialog -->
  <el-dialog
    :model-value="relationDialogVisible"
    :title="editingRelationId ? '编辑关系' : '新建关系'"
    width="420px"
    @close="relationDialogVisible = false"
  >
    <div class="relation-preview">
      <span class="rel-char-name">{{ getCharName(relationSourceId) }}</span>
      <span class="rel-arrow">{{ relationType === 'directed' ? '→' : '↔' }}</span>
      <span class="rel-char-name">{{ getCharName(relationTargetId) }}</span>
    </div>
    <el-form label-position="top">
      <el-form-item label="关系描述" required>
        <el-input
          v-model="relationLabel"
          placeholder="如：父子、仇敌、暗恋"
        />
      </el-form-item>
      <el-form-item label="关系类型">
        <el-radio-group v-model="relationType">
          <el-radio value="directed">单向 <el-tag size="small" style="margin-left: 4px">A → B</el-tag></el-radio>
          <el-radio value="bidirectional">双向 <el-tag size="small" style="margin-left: 4px">A ↔ B</el-tag></el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="editingRelationId" label="操作">
        <el-button type="danger" text @click="removeRelation(editingRelationId); relationDialogVisible = false">
          删除该关系
        </el-button>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="relationDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="saveRelation" :disabled="!relationLabel.trim()">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.character-graph {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  margin-bottom: 8px;
  flex-shrink: 0;
}

.char-count {
  font-weight: 400;
  color: var(--text-muted);
}

.toolbar-actions {
  display: flex;
  gap: 6px;
}

.connect-hint {
  font-size: 12px;
  color: var(--color-warning);
  background: rgba(230, 162, 60, 0.08);
  padding: 4px 10px;
  border-radius: 4px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

/* ===== Graph Canvas ===== */

.graph-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg-page);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  min-height: 300px;
  cursor: grab;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.graph-canvas.is-panning {
  cursor: grabbing;
}

.graph-canvas.is-connect-mode {
  border-color: var(--color-warning);
  box-shadow: 0 0 0 1px var(--color-warning);
}

/* Transform wrapper for panning */
.canvas-transform {
  position: relative;
  width: 100%;
  height: 100%;
}

.graph-svg {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: none;
}

.canvas-boundary {
  fill: none;
  stroke: var(--border-color);
  stroke-width: 1.5;
  stroke-dasharray: 8 4;
  pointer-events: none;
  transition: stroke 0.2s;
}

.canvas-boundary.is-connect-mode {
  stroke: var(--color-warning);
}

.inside-bg {
  fill: var(--bg-card);
  pointer-events: none;
}

.grid-overlay {
  pointer-events: none;
}

.grid-line {
  stroke: var(--border-color);
  stroke-opacity: 0.4;
}

.edge-group {
  pointer-events: auto;
  cursor: pointer;
}

.edge-click-target {
  cursor: pointer;
}

.edge-line {
  stroke: var(--text-muted);
  transition: stroke 0.15s, stroke-width 0.15s;
}

.edge-group.is-hovered .edge-line {
  stroke: var(--primary);
  stroke-width: 3;
}

.edge-label-bg {
  fill: var(--bg-card);
  stroke: var(--border-color);
  stroke-width: 1;
}

.edge-group.is-hovered .edge-label-bg {
  stroke: var(--primary);
  fill: var(--bg-card);
}

.edge-label-text {
  fill: var(--text-secondary);
  font-size: 11px;
}

.edge-group.is-hovered .edge-label-text {
  fill: var(--primary);
  font-weight: 600;
}

/* ===== Character Nodes ===== */

.char-node {
  position: absolute;
  z-index: 2;
  background: var(--bg-card-inner);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: grab;
  user-select: none;
  transition: box-shadow 0.15s, border-color 0.15s;
  min-height: 60px;
  min-width: 0;
}

.char-node:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.char-node.is-selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.char-node.is-connect-source {
  border-color: var(--color-warning);
  box-shadow: 0 0 0 2px rgba(230, 162, 60, 0.25);
}

.char-node.is-connect-target {
  border-color: var(--color-success);
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.2);
  cursor: pointer;
}

.char-node.is-dragging {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 10;
  transition: none;
}

.char-node.is-connect-mode {
  cursor: pointer;
}

.char-node-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.char-node-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.char-node-personality {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-delete-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  opacity: 0;
  font-size: 11px;
  padding: 0 4px;
}

.char-node:hover .node-delete-btn {
  opacity: 1;
}

.empty-hint {
}

/* ===== Character Navigator ===== */

.char-navigator {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  min-width: 110px;
  max-width: 170px;
  max-height: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-size: 12px;
  overflow: hidden;
}

.char-navigator.collapsed {
  min-width: auto;
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-primary);
  user-select: none;
}

.nav-header:hover {
  background: var(--bg-card-inner);
}

.nav-arrow {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: 8px;
}

.nav-body {
  max-height: 155px;
  overflow-y: auto;
  border-top: 1px solid var(--border-color);
}

.nav-item {
  padding: 4px 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.12s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item:hover {
  background: var(--bg-card-inner);
  color: var(--primary);
}

.nav-item.active {
  color: var(--primary);
  font-weight: 500;
  background: rgba(64, 158, 255, 0.06);
}

/* ===== Relation Dialog ===== */

.relation-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-card-inner);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.rel-char-name {
  font-weight: 600;
  color: var(--text-primary);
}

.rel-arrow {
  font-size: 18px;
  color: var(--text-muted);
}
</style>
