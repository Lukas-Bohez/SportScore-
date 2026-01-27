<script setup>
import EmojiPicker from "vue3-emoji-picker";
import "vue3-emoji-picker/css";
import { ref, onMounted, onUnmounted } from "vue";

const emit = defineEmits(["select"]);

const selectedEmoji = ref("😊");
const emojiName = ref("Smiling Face with Smiling Eyes");
const showPicker = ref(false);
const pickerContainer = ref(null);

function onSelectEmoji(emoji) {
  selectedEmoji.value = emoji.i;
  emojiName.value = emoji.n || "Emoji";
  showPicker.value = false;

  // Emit the emoji data to parent
  emit("select", emoji);

  console.log(emoji);
}

function togglePicker() {
  showPicker.value = !showPicker.value;
}

function handleClickOutside(event) {
  if (pickerContainer.value && !pickerContainer.value.contains(event.target)) {
    showPicker.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="feature-picker-container">
    <p>Emoji</p>
    <div class="emoji-picker-container" ref="pickerContainer">
      <div class="input-wrapper">
        <div class="emoji-display"></div>
        <button @click="togglePicker" class="emoji-button" type="button">
          {{ selectedEmoji }}
        </button>
      </div>

      <!-- <div class="emoji-name-label">
        {{ emojiName }}
      </div> -->

      <div v-if="showPicker" class="picker-dropdown">
        <EmojiPicker
          :native="true"
          :display-recent="true"
          @select="onSelectEmoji"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-picker-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.emoji-picker-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: fit-content;
  justify-content: center;
}

.emoji-display {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.8125rem;
  padding: 0 2.2rem 0 0.4rem;
  border: 1px solid var(--black-40);
  border-radius: var(--radius-L);
  font-size: 1rem;
  background: var(--white);
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}

.emoji-display:focus-within {
  border-color: var(--blue-100);
}

.emoji-button {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  padding: 0 0.3rem;
  border-radius: var(--radius-S);
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-family:
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}

.emoji-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.emoji-name-label {
  padding-left: 0.25rem;
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: var(--radius-M);
  max-width: 90vw;
}

/* Responsive adjustments for smaller screens */
@media (max-width: 768px) {
  .picker-dropdown {
    position: fixed;
    top: 50%;
    left: 50%;
    right: auto;
    transform: translate(-50%, -50%);
    max-width: 95vw;
    max-height: 80vh;
    overflow: auto;
  }
}
</style>
