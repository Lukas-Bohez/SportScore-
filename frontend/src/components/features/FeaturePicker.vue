<script setup>
import EmojiPicker from "vue3-emoji-picker";
import "vue3-emoji-picker/css";
import { ref } from "vue";

const selectedEmoji = ref("");

function onSelectEmoji(emoji) {
  selectedEmoji.value = emoji.i; // unicode emoji
  console.log(emoji);
  /*
    emoji object structure:
    { 
      i: "😚", // emoji unicode
      n: ["kissing face"], // emoji name(s)
      r: "1f61a", // with skin tone
      t: "neutral", // skin tone
      u: "1f61a" // without tone
    }
  */
}
</script>

<template>
  <div class="emoji-picker-container">
    <EmojiPicker
      :native="true"
      :display-recent="true"
      @select="onSelectEmoji"
    />

    <div v-if="selectedEmoji" class="selected-emoji">
      <p>
        Gekozen emoji: <span class="emoji">{{ selectedEmoji }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.emoji-picker-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.selected-emoji {
  padding: 1rem;
  background: var(--white);
  border-radius: 8px;
  text-align: center;
}

.selected-emoji .emoji {
  font-size: 2rem;
  margin-left: 0.5rem;
}
</style>
