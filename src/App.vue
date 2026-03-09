<script setup lang="ts">
import Peer, { type DataConnection } from 'peerjs';
import { nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref } from 'vue';

interface Message {
  from: 'me' | 'them' | 'system';
  text: string;
}

/** The local Peer instance managing this client's identity and connections. */
const peer = ref<Peer | null>(null);
/** This peer's own ID, assigned by the PeerJS server on connect. */
const myId = ref('');
/** Active data connection to the remote peer. */
const conn = ref<DataConnection | null>(null);
/** The peer ID typed by the user to initiate an outgoing connection. */
const remoteId = ref('');
/** Current value of the message input field. */
const input = ref('');
/** Chat history including user messages and system notifications. */
const messages = ref<Message[]>([]);
/** Template ref for the chat scrollable container. */
const chatBox = ref<HTMLElement | null>(null);
/** Tracks whether the ID was just copied, to show brief feedback. */
const copied = ref(false);

onBeforeMount(() => {
  const name = prompt('Enter your name')?.trim();
  if (name) {
    myId.value = name + '-' + Math.floor(Math.random() * 1000);
  }
});

onMounted(() => {
  // Create a new PeerJS instance with the generated ID (or empty to let server assign one)
  const p = new Peer(myId.value);
  peer.value = p;
  p.on('open', (id) => (myId.value = id));
  p.on('error', (err) => alert(`Error: ${err.message}`));
  p.on('connection', (incoming) => {
    setupConn(incoming);
    notify(`${incoming.peer} connected`);
    remoteId.value = incoming.peer; // pre-fill remote ID input for convenience
  });
});

onBeforeUnmount(() => {
  conn.value?.close();
  peer.value?.destroy();
});

function setupConn(c: DataConnection) {
  conn.value = c; // save the active connection to send messages later
  c.on('data', (data) => {
    // `data` should be the same on `conn.send()` from the other peer, but we convert it to string just in case
    messages.value.push({ from: 'them', text: String(data) });
    scrollDown();
  });
  c.on('close', () => {
    conn.value = null;
    notify(`${c.peer} disconnected`);
  });
}

function connect() {
  if (!peer.value || !remoteId.value.trim()) return;
  const c = peer.value.connect(remoteId.value.trim());
  setupConn(c);
  c.on('open', () => notify(`Connected to ${c.peer}`));
  c.on('error', (err) => alert(`Could not connect: ${err.message}`));
}

function send() {
  if (!conn.value || !input.value.trim()) return;
  conn.value.send(input.value); // `data` sent will be received by other peer's `conn.on('data')` handler
  messages.value.push({ from: 'me', text: input.value });
  input.value = '';
  scrollDown();
}

function notify(text: string) {
  messages.value.push({ from: 'system', text });
  scrollDown();
}

async function scrollDown() {
  await nextTick();
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
}

async function copyId() {
  if (!myId.value) return;
  await navigator.clipboard.writeText(myId.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-md">
      <!-- ! Header: your peer ID (click to copy) -->
      <div
        class="bg-primary-600 group cursor-pointer px-4 py-3 text-white select-none"
        @click="copyId"
        title="Click to copy"
      >
        <p class="text-xs opacity-75">Your ID <span class="opacity-60">(click to copy)</span></p>
        <div class="flex items-center gap-2">
          <p class="flex-1 truncate font-mono text-sm font-semibold">
            {{ myId || 'connecting...' }}
          </p>
          <span
            class="text-xs opacity-75 transition-opacity"
            :class="copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </span>
        </div>
      </div>

      <!-- ! Connect to a peer -->
      <div class="flex gap-2 border-b p-3">
        <input
          v-model="remoteId"
          placeholder="Enter peer ID to connect..."
          class="focus:ring-primary-400 flex-1 rounded-lg border-0 px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
          @keyup.enter="connect"
        />
        <button
          @click="connect"
          class="bg-primary-600 hover:bg-primary-700 rounded-lg px-3 py-1.5 text-sm text-white transition"
        >
          Connect
        </button>
      </div>

      <!-- ! Messages -->
      <div ref="chatBox" class="h-80 space-y-2 overflow-y-auto p-3">
        <p v-if="!messages.length" class="mt-8 text-center text-sm text-gray-400">
          No messages yet
        </p>
        <template v-for="(msg, i) in messages" :key="i">
          <!-- ! System notification -->
          <p v-if="msg.from === 'system'" class="text-center text-xs text-gray-400">
            {{ msg.text }}
          </p>
          <!-- ! Chat bubble -->
          <div v-else :class="msg.from === 'me' ? 'flex justify-end' : 'flex justify-start'">
            <span
              :class="msg.from === 'me' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'"
              class="max-w-[75%] rounded-xl px-3 py-2 text-sm wrap-break-word"
            >
              {{ msg.text }}
            </span>
          </div>
        </template>
      </div>

      <!-- ! Send message -->
      <div class="flex gap-2 border-t p-3">
        <input
          v-model="input"
          placeholder="Type a message..."
          :disabled="!conn"
          class="focus:ring-primary-400 flex-1 rounded-lg border-0 px-3 py-1.5 text-sm focus:ring-2 focus:outline-none disabled:opacity-40"
          @keyup.enter="send"
        />
        <button
          @click="send"
          :disabled="!conn"
          class="bg-primary-600 hover:bg-primary-700 rounded-lg px-3 py-1.5 text-sm text-white transition disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>
