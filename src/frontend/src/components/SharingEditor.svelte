<script lang="ts">
import type { NoteModel } from "../lib/note";
import { auth } from "../store/auth";
import { addUser, refreshNotes, removeUser } from "../store/notes";
import { addNotification, showError } from "../store/notifications";

export let editedNote: NoteModel;
// biome-ignore lint/style/useConst: <explanation>
export let ownedByMe = false;

import { createEventDispatcher } from "svelte";

const dispatch = createEventDispatcher();

let newSharing = "";
// biome-ignore lint/style/useConst: <explanation>
let newWhenValue = "";
// biome-ignore lint/style/useConst: <explanation>
let newWhenChecked = true;
// biome-ignore lint/style/useConst: <explanation>
let newSharingChecked = true;
let newSharingInput: HTMLInputElement;
let newWhenInput: HTMLInputElement;
let adding = false;
let removing = false;

function dateValue(input: string): bigint {
	if (!input) {
		return null;
	}
	const date = new Date(input);
	return BigInt(date.valueOf()) * BigInt(1000000);
}

async function add() {
	adding = true;
	try {
		await addUser(
			editedNote.id,
			newSharingChecked ? null : newSharing || null,
			dateValue(newWhenValue),
			$auth.actor,
		);
		addNotification({
			type: "success",
			message: "User successfully added",
		});
		editedNote.users = [
			...editedNote.users.filter((u) => u.name !== newSharing),
			{ name: newSharing, when: dateValue(newWhenValue) },
		];
		dispatch("message", {
			action: "shared",
			user: newSharingChecked ? null : newSharing || "everyone",
			when: Number(dateValue(newWhenValue) / BigInt(1000000)),
			createdAt: Date.now(),
		});
		newSharing = "";
		newSharingChecked = true;
		newSharingInput.focus();
		newWhenChecked = true;
	} catch (e) {
		showError(e, "Could not add user.");
	} finally {
		adding = false;
	}
	await refreshNotes($auth.actor, $auth.crypto).catch((e) =>
		showError(e, "Could not refresh notes."),
	);
}

async function remove(sharing: string) {
	removing = true;
	try {
		await removeUser(editedNote.id, sharing, $auth.actor);
		editedNote.users = editedNote.users.filter((u) => u !== sharing);
		addNotification({
			type: "success",
			message: "User successfully removed",
		});
		dispatch("message", {
			action: "unshared",
			user: newSharingChecked ? null : newSharing || "everyone",
			when: null,
			createdAt: Date.now(),
		});
	} catch (e) {
		showError(e, "Could not remove user.");
	} finally {
		removing = false;
	}
	await refreshNotes($auth.actor, $auth.crypto).catch((e) =>
		showError(e, "Could not refresh notes."),
	);
}

function onKeyPress(e) {
	if (
		e.key === "Enter" &&
		newSharing.trim().length > 0 &&
		!editedNote.users.find(
			(e) => e.name === newSharing && e.when === dateValue(newWhenValue),
		)
	) {
		add();
	}
}
</script>

<div class="bg-gray-100 p-4 rounded-lg shadow-md">
  <p class="text-lg font-bold mb-2">Additional Readers</p>
  {#if ownedByMe}
    <p class="mt-1">
      Add users by their principal to allow them read the IP Doc.
      Optionally you can set a date at which the note will show.
    </p>
  {:else}
    <p class="mt-3">
      This note is <span class="font-bold">shared</span> with you. It is owned
      by <span class="italic font-bold">{editedNote.owner}</span>.
    </p>
    <p class="mt-3">Users with whom the owner shared the note:</p>
  {/if}
  <div class="flex flex-col space-x-2 mt-2">
    {#each editedNote.users as sharing}
      <div class="flex flex-row">
        <button
          class="btn btn-outline btn-sm flex flex-row items-center"
          on:click={() => {
            remove(sharing.name);
          }}
          disabled={adding || removing || !ownedByMe}
        >
          <span>{sharing.name || "everyone"}</span>
          <span>{sharing.when ? (new Date(Number(sharing.when / BigInt(1000000)))).toLocaleDateString() : "always"}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2"/>
              <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    {/each}
    <div class="flex flex-row">
      <label class="mx-3 {!ownedByMe ? 'hidden' : ''}"><input
        type="checkbox"
        bind:checked={newSharingChecked}
        class="mt-2"
        disabled={adding || removing}/> Everyone</label>
      <input
        bind:value={newSharing}
        placeholder="Add principal..."
        class="mx-3 bg-transparent text-base rounded-lg h-8 px-3 w-auto {adding ||
        removing
          ? 'opacity-50'
          : ''} 
          {!ownedByMe || newSharingChecked ? 'hidden' : ''}"
        bind:this={newSharingInput}
        on:keypress={onKeyPress}
        disabled={adding}
      />
      <label class="mx-3 {!ownedByMe ? 'hidden' : ''}"><input
        type="checkbox"
        bind:checked={newWhenChecked}
        class="mt-2"
        disabled={adding || removing}/> Always</label>
      <input
        bind:value={newWhenValue}
        placeholder="Add date..."
        type="datetime-local"
        class="mx-3 bg-transparent text-base rounded-lg h-8 px-3 w-auto {adding ||
        removing
          ? 'opacity-50'
          : ''} 
          {!ownedByMe || newWhenChecked ? 'hidden' : ''}"
        bind:this={newWhenInput}
        on:keypress={onKeyPress}
        disabled={adding || newWhenChecked}
      />
      <button
        class="mx-3 btn btn-sm btn-ghost
          {!ownedByMe ? 'hidden' : ''}
          {adding || removing ? 'loading' : ''}"
        on:click={add}
        disabled={(newSharingChecked ? false : newSharing.trim().length === 0) ||
          editedNote.users.find((u) => newSharingChecked ? u.name === null : u.name === newSharing && u.when === dateValue(newWhenValue)) != null ||
          adding ||
          removing}
        >{adding ? 'Adding...' : removing ? 'Removing... ' : 'Add'}</button
      >
    </div>
  </div>
</div>
