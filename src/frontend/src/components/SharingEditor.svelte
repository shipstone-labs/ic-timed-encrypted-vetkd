<script lang="ts">
import type { NoteModel } from "../lib/note";
import { auth } from "../store/auth";
import { addUser, refreshNotes, removeUser } from "../store/notes";
import { addNotification, showError } from "../store/notifications";

export let editedNote: NoteModel;
// biome-ignore lint/style/useConst: <explanation>
export let ownedByMe = false;

let newSharing = "";
// biome-ignore lint/style/useConst: <explanation>
let newWhenValue = "";
// biome-ignore lint/style/useConst: <explanation>
let newWhenChecked = true;
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
			newSharing || null,
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
		newSharing = "";
		newSharingInput.focus();
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

<div class="flex flex-col flex-wrap mt-4">
  <p class="text-lg font-bold">Users</p>
  {#if ownedByMe}
    <p class="mt-1">
      Add users by their principal to allow them editing the note.
    </p>
  {:else}
    <p class="mt-3">
      This note is <span class="font-bold">shared</span> with you. It is owned
      by <span class="italic font-bold">{editedNote.owner}</span>.
    </p>
    <p class="mt-3">Users with whom the owner shared the note:</p>
  {/if}
  <div class="flex flex-row space-x-2 mt-2">
    {#each editedNote.users as sharing}
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
    {/each}
    <div class="flex flex-row">
      <input
        bind:value={newSharing}
        placeholder="Add principal..."
        class="bg-transparent text-base rounded-lg h-8 px-3 w-auto {adding ||
        removing
          ? 'opacity-50'
          : ''} 
          {!ownedByMe ? 'hidden' : ''}"
        bind:this={newSharingInput}
        on:keypress={onKeyPress}
        disabled={adding}
      />
      <label class="{!ownedByMe ? 'hidden' : ''}"><input
        type="checkbox"
        bind:checked={newWhenChecked}
        class="mt-2"
        disabled={adding || removing}/> Always</label>
      <input
        bind:value={newWhenValue}
        placeholder="Add date..."
        type="datetime-local"
        class="bg-transparent text-base rounded-lg h-8 px-3 w-auto {adding ||
        removing
          ? 'opacity-50'
          : ''} 
          {!ownedByMe || newWhenChecked ? 'hidden' : ''}"
        bind:this={newWhenInput}
        on:keypress={onKeyPress}
        disabled={adding || newWhenChecked}
      />
      <button
        class="btn btn-sm btn-ghost
          {!ownedByMe ? 'hidden' : ''}
          {adding || removing ? 'loading' : ''}"
        on:click={add}
        disabled={newSharing.trim().length === 0 ||
          editedNote.users.find((u) => u.name === newSharing && u.when === dateValue(newWhenValue)) != null ||
          adding ||
          removing}
        >{adding ? 'Adding...' : removing ? 'Removing... ' : 'Add'}</button
      >
    </div>
  </div>
</div>
