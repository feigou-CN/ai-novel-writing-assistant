<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Star, StarFilled } from '@element-plus/icons-vue'
import { useMaterialStore } from '@/stores/materialStore'
import { useNovelStore } from '@/stores/novelStore'
import { useChapterStore } from '@/stores/chapterStore'
import type { TimelineEvent, TimelineTrack } from '@/types'

const materialStore = useMaterialStore()
const novelStore = useNovelStore()
const chapterStore = useChapterStore()

// Track dialog
const trackDialogVisible = ref(false)
const trackName = ref('')
const trackOrder = ref(1)
const editingTrackId = ref<string | undefined>()

// Event dialog
const eventDialogVisible = ref(false)
const eventName = ref('')
const eventDesc = ref('')
const eventChapter = ref(1)
const eventEndChapter = ref<number | undefined>()
const eventImportant = ref(false)
const eventTrackId = ref('')
const editingEventId = ref<string | undefined>()

// === Computed ===

const chapterRange = computed(() => {
  const maxChOrder = chapterStore.sortedChapters.reduce((max, ch) => Math.max(max, ch.order), 0)
  const maxEventOrder = materialStore.timelineEvents.reduce(
    (max, e) => Math.max(max, e.endOrder || e.order), 0,
  )
  const max = Math.max(maxChOrder, maxEventOrder, 0)
  return Array.from({ length: max }, (_, i) => i + 1)
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `52px repeat(${materialStore.timelineTracks.length}, minmax(220px, 1fr))`,
}))

const currentChapterOrder = computed(() => chapterStore.currentChapter?.order ?? null)

// === Event queries ===

/** Regular events that start at this exact chapter */
function getEventsAt(trackId: string, chapter: number): TimelineEvent[] {
  return materialStore.timelineEvents.filter(
    e => e.trackId === trackId
      && e.order === chapter
      && (!e.endOrder || e.endOrder <= e.order),
  )
}

/** Spanning event that starts at this chapter (if any) */
function getSpanStartingAt(trackId: string, chapter: number): TimelineEvent | undefined {
  return materialStore.timelineEvents.find(
    e => e.trackId === trackId
      && e.order === chapter
      && e.endOrder
      && e.endOrder > e.order,
  )
}

/** Whether this chapter is within a spanning event from an earlier chapter */
function isWithinSpan(trackId: string, chapter: number): TimelineEvent | undefined {
  return materialStore.timelineEvents.find(
    e => e.trackId === trackId
      && e.order < chapter
      && e.endOrder
      && e.endOrder >= chapter
      && e.endOrder > e.order,
  )
}

function hasDuration(e: TimelineEvent): boolean {
  return !!e.endOrder && e.endOrder > e.order
}

function getSpanStartAsArray(trackId: string, chapter: number): TimelineEvent[] {
  const e = getSpanStartingAt(trackId, chapter)
  return e ? [e] : []
}

// === Track CRUD ===

function openCreateTrack() {
  editingTrackId.value = undefined
  trackName.value = ''
  trackOrder.value = materialStore.timelineTracks.length + 1
  trackDialogVisible.value = true
}

function openEditTrack(track: TimelineTrack) {
  editingTrackId.value = track.id
  trackName.value = track.name
  trackOrder.value = track.order
  trackDialogVisible.value = true
}

async function saveTrack() {
  const novelId = novelStore.currentNovel?.id
  if (!novelId || !trackName.value.trim()) return
  await materialStore.saveTimelineTrack({
    id: editingTrackId.value,
    novelId,
    name: trackName.value.trim(),
    order: trackOrder.value,
  })
  trackDialogVisible.value = false
  ElMessage.success('时间线已保存')
}

async function removeTrack(id: string) {
  try {
    await ElMessageBox.confirm('确定删除该时间线吗？其中的事件也将一并删除。', '确认', { type: 'warning' })
    await materialStore.deleteTimelineTrack(id)
    ElMessage.success('已删除')
  } catch { /* cancel */ }
}

// === Event CRUD ===

function openCreateEvent(trackId: string) {
  editingEventId.value = undefined
  eventName.value = ''
  eventDesc.value = ''
  eventChapter.value = currentChapterOrder.value ?? 1
  eventEndChapter.value = undefined
  eventImportant.value = false
  eventTrackId.value = trackId
  eventDialogVisible.value = true
}

function openEditEvent(event: TimelineEvent) {
  editingEventId.value = event.id
  eventName.value = event.name
  eventDesc.value = event.description
  eventChapter.value = event.order
  eventEndChapter.value = event.endOrder
  eventImportant.value = !!event.important
  eventTrackId.value = event.trackId
  eventDialogVisible.value = true
}

async function saveEvent() {
  const novelId = novelStore.currentNovel?.id
  if (!novelId || !eventName.value.trim()) return
  await materialStore.saveTimelineEvent({
    id: editingEventId.value,
    novelId,
    trackId: eventTrackId.value,
    name: eventName.value.trim(),
    description: eventDesc.value,
    order: eventChapter.value,
    endOrder: eventEndChapter.value,
    important: eventImportant.value || undefined,
  })
  eventDialogVisible.value = false
  ElMessage.success('事件已保存')
}

async function removeEvent(id: string) {
  try {
    await ElMessageBox.confirm('确定删除该事件吗？', '确认', { type: 'warning' })
    await materialStore.deleteTimelineEvent(id)
    ElMessage.success('已删除')
  } catch { /* cancel */ }
}

async function toggleImportant(event: TimelineEvent) {
  await materialStore.saveTimelineEvent({
    ...event,
    important: !event.important,
  })
}

function trackCol(trackIdx: number): number {
  return trackIdx + 2  // 1 = chapter label column
}
</script>

<template>
  <div class="timeline-editor">
    <!-- Toolbar -->
    <div class="editor-toolbar">
      <span class="section-title">时间线（{{ materialStore.timelineTracks.length }}条）</span>
      <el-button size="small" type="primary" :icon="Plus" @click="openCreateTrack">
        添加时间线
      </el-button>
    </div>

    <!-- Empty state -->
    <div v-if="materialStore.timelineTracks.length === 0" class="empty-hint">
      还没有时间线，点击上方按钮添加
    </div>

    <!-- Matrix -->
    <div v-else class="matrix-wrapper">
      <div class="matrix-grid" :style="gridStyle">
        <!-- ===== Header row ===== -->
        <div class="mtx-header mtx-chapter-header" :style="{ gridColumn: 1, gridRow: 1 }">
          章节
        </div>
        <div
          v-for="(track, i) in materialStore.timelineTracks"
          :key="track.id"
          class="mtx-header"
          :style="{ gridColumn: trackCol(i), gridRow: 1 }"
        >
          <div class="mtx-header-inner">
            <span class="mtx-header-title">{{ track.name }}</span>
            <span class="mtx-header-actions">
              <el-button text size="small" @click.stop="openCreateEvent(track.id)">+</el-button>
              <el-button text size="small" @click="openEditTrack(track)">编辑</el-button>
              <el-button text size="small" type="danger" @click="removeTrack(track.id)">删除</el-button>
            </span>
          </div>
        </div>

        <!-- ===== Chapter rows ===== -->
        <template v-for="ch in chapterRange" :key="ch">
          <!-- Chapter label -->
          <div
            class="mtx-chapter"
            :class="{ 'is-current': ch === currentChapterOrder }"
            :style="{ gridColumn: 1, gridRow: ch + 1 }"
          >
            <span class="ch-label">{{ ch }}</span>
          </div>

          <!-- Cells for each track at this chapter -->
          <div
            v-for="(track, i) in materialStore.timelineTracks"
            :key="`${track.id}-${ch}`"
            class="mtx-cell"
            :class="{
              'is-current': ch === currentChapterOrder,
              'is-within-span': !!isWithinSpan(track.id, ch),
            }"
            :style="{ gridColumn: trackCol(i), gridRow: ch + 1 }"
          >
            <!-- Span start card -->
            <template v-for="span in getSpanStartAsArray(track.id, ch)" :key="span.id">
              <div class="event-card span-card" :class="{ 'is-important': span.important }">
                <div class="span-marker">持续</div>
                <div class="ec-header">
                  <span class="ec-name">{{ span.order }}. {{ span.name }}</span>
                  <span class="duration-badge">{{ span.order }}→{{ span.endOrder }}</span>
                </div>
                <div class="ec-desc">{{ span.description || '暂无描述' }}</div>
                <div class="ec-actions">
                  <el-tooltip :content="span.important ? '取消重点' : '标记为重点'" :show-after="300">
                    <el-button
                      text
                      size="small"
                      class="star-btn"
                      :class="{ 'is-active': span.important }"
                      @click.stop="toggleImportant(span)"
                    >
                      <el-icon><StarFilled v-if="span.important" /><Star v-else /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-button size="small" text @click.stop="openEditEvent(span)">编辑</el-button>
                  <el-button size="small" text type="danger" @click.stop="removeEvent(span.id)">删除</el-button>
                </div>
              </div>
            </template>

            <!-- Regular event cards -->
            <div
              v-for="event in getEventsAt(track.id, ch)"
              :key="event.id"
              class="event-card"
              :class="{ 'is-important': event.important, 'has-duration': hasDuration(event) }"
            >
              <div class="event-dot" />
              <div class="ec-content">
                <div class="ec-header">
                  <span class="ec-name">{{ event.name }}</span>
                  <el-tooltip :content="event.important ? '取消重点' : '标记为重点'" :show-after="300">
                    <el-button
                      text
                      size="small"
                      class="star-btn"
                      :class="{ 'is-active': event.important }"
                      @click.stop="toggleImportant(event)"
                    >
                      <el-icon><StarFilled v-if="event.important" /><Star v-else /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <span v-if="hasDuration(event)" class="duration-badge">
                    {{ event.order }}→{{ event.endOrder }}
                  </span>
                </div>
                <div class="ec-desc">{{ event.description || '暂无描述' }}</div>
                <div class="ec-actions">
                  <el-button size="small" text @click.stop="openEditEvent(event)">编辑</el-button>
                  <el-button size="small" text type="danger" @click.stop="removeEvent(event.id)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Add event buttons in last row -->
        <div
          v-for="(track, i) in materialStore.timelineTracks"
          :key="`add-${track.id}`"
          class="mtx-add-row"
          :style="{ gridColumn: trackCol(i), gridRow: chapterRange.length + 2 }"
        >
          <el-button size="small" text class="add-event-btn" @click="openCreateEvent(track.id)">
            + 添加事件
          </el-button>
        </div>
      </div>
    </div>

    <!-- Track dialog -->
    <el-dialog
      :model-value="trackDialogVisible"
      :title="editingTrackId ? '编辑时间线' : '添加时间线'"
      width="400px"
      @close="trackDialogVisible = false"
    >
      <el-form label-position="top">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number v-model="trackOrder" :min="1" />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="名称" required>
              <el-input v-model="trackName" placeholder="如：主线、支线、反派线" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="trackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTrack" :disabled="!trackName.trim()">保存</el-button>
      </template>
    </el-dialog>

    <!-- Event dialog -->
    <el-dialog
      :model-value="eventDialogVisible"
      :title="editingEventId ? '编辑事件' : '添加事件'"
      width="520px"
      @close="eventDialogVisible = false"
    >
      <el-form label-position="top">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="起始章节">
              <el-input-number v-model="eventChapter" :min="1" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结束章节（可选）">
              <el-input-number
                v-model="eventEndChapter"
                :min="eventChapter"
                :disabled="eventEndChapter === undefined"
                placeholder="跨度"
              >
                <template #suffix>
                  <el-button
                    v-if="eventEndChapter !== undefined"
                    text
                    size="small"
                    @click="eventEndChapter = undefined"
                  >清除</el-button>
                  <el-button
                    v-else
                    text
                    size="small"
                    @click="eventEndChapter = eventChapter"
                  >设置</el-button>
                </template>
              </el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="所属时间线">
              <el-select v-model="eventTrackId" style="width: 100%">
                <el-option
                  v-for="t in materialStore.timelineTracks"
                  :key="t.id"
                  :label="t.name"
                  :value="t.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="事件名称" required>
          <el-input v-model="eventName" placeholder="事件名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="eventDesc" type="textarea" :rows="3" placeholder="事件的详细描述..." />
        </el-form-item>
        <el-form-item label="重点事件">
          <el-switch
            v-model="eventImportant"
            active-text="标记为重点（金色高亮显示）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="eventDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEvent" :disabled="!eventName.trim()">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.timeline-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  margin-bottom: 12px;
  flex-shrink: 0;
}

/* ===== Matrix Layout ===== */

.matrix-wrapper {
  flex: 1;
  overflow: auto;
}

.matrix-grid {
  display: grid;
  width: fit-content;
  min-width: 100%;
  gap: 0;
}

/* ===== Headers ===== */

.mtx-header {
  padding: 6px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-card);
  border-bottom: 2px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 3;
  min-width: 0;
}

.mtx-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.mtx-header-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.mtx-header-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.mtx-header:hover .mtx-header-actions {
  opacity: 1;
}

.mtx-chapter-header {
  position: sticky;
  left: 0;
  z-index: 4;
  text-align: center;
  background: var(--bg-card);
}

/* ===== Chapter label column ===== */

.mtx-chapter {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 18px 4px 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-card);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  left: 0;
  z-index: 2;
}

.mtx-chapter.is-current {
  color: var(--primary);
  background: rgba(64, 158, 255, 0.06);
}

.ch-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  transition: background 0.15s;
}

.mtx-chapter.is-current .ch-label {
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}

/* ===== Cells ===== */

.mtx-cell {
  position: relative;
  min-height: 56px;
  padding: 6px 8px;
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
  transition: background 0.15s;
  min-width: 0;              /* prevent grid item from stretching */
  overflow-wrap: break-word;  /* break long text */
  word-break: break-word;     /* CJK friendly wrapping */
}

/* Vertical line in each cell - connects to form column line */
.mtx-cell::before {
  content: '';
  position: absolute;
  left: 16px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-color);
  z-index: 1;
  pointer-events: none;
}

.mtx-cell.is-current {
  background: rgba(64, 158, 255, 0.04);
}

.mtx-cell.is-within-span {
  background: rgba(64, 158, 255, 0.03);
}

/* ===== Event Cards ===== */

.event-card {
  position: relative;
  background: var(--bg-card-inner);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
  transition: border-color 0.15s, box-shadow 0.15s;
  z-index: 2;
  min-width: 0;
  width: 100%;
}

.event-card:last-child {
  margin-bottom: 0;
}

.event-card:hover {
  border-color: var(--primary);
}

.event-card.is-important {
  border-color: rgba(230, 162, 60, 0.4);
}

.event-card.is-important:hover {
  border-color: #e6a23c;
  box-shadow: 0 0 0 1px rgba(230, 162, 60, 0.12);
}

/* Event dot on the vertical line */
.event-dot {
  position: absolute;
  left: -8px;
  top: 14px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  border: 3px solid var(--bg-card);
  z-index: 3;
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
}

.event-card.is-important .event-dot {
  background: #e6a23c;
  box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.25);
  transform: scale(1.15);
}

.event-card.has-duration .event-dot {
  border-radius: 3px;
  width: 13px;
  height: 13px;
  left: -8.5px;
  top: 13px;
}

.event-card.is-important.has-duration .event-dot {
  border-radius: 3px;
}

/* Span card */
.span-card {
  border-left: 3px solid var(--primary);
  background: rgba(64, 158, 255, 0.04);
}

.span-card.is-important {
  border-left-color: #e6a23c;
  background: rgba(230, 162, 60, 0.04);
}

.span-marker {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 4px;
}

.span-card.is-important .span-marker {
  color: #e6a23c;
}

/* ===== Event card content ===== */

.ec-content {
  min-width: 0;
  width: 100%;
  overflow-wrap: break-word;
  word-break: break-all;
}

.ec-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.ec-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: keep-all;      /* prevent mid-word break in names */
}

.ec-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 4px;
  word-break: break-all;
  width: 100%;
  max-height: calc(1.5em * 3);
  overflow: hidden;
}

.ec-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.event-card:hover .ec-actions {
  opacity: 1;
}

.star-btn {
  font-size: 15px;
  color: var(--text-muted);
  transition: color 0.15s, transform 0.15s;
}

.star-btn:hover {
  color: #e6a23c;
  transform: scale(1.2);
}

.star-btn.is-active {
  color: #e6a23c;
}

.duration-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
  background: rgba(64, 158, 255, 0.1);
  padding: 1px 7px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.event-card.is-important .duration-badge {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.12);
}

/* ===== Add button row ===== */

.mtx-add-row {
  padding: 8px;
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.add-event-btn {
  width: 100%;
  border-style: dashed;
  color: var(--text-muted);
}
</style>
