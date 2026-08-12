<script lang="ts">
	import { onMount } from 'svelte';
	import axios from 'axios';
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		Input,
		Label,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Badge,
		Spinner,
		Modal,
		Alert,
		Toggle,
		Textarea
	} from 'flowbite-svelte';
	import {
		CogOutline,
		EditOutline,
		PlusOutline,
		RefreshOutline
	} from 'flowbite-svelte-icons';
	import MetaTag from '../../../utils/MetaTag.svelte';

	const apiUrl = process.env.VITE_API_URL || 'https://prodbackend.octobrain.org';

	let settings: any[] = [];
	let loading: boolean = true;
	let errorMessage: string = '';
	let successMessage: string = '';

	// Modal Edit/Create State
	let showModal: boolean = false;
	let isEditMode: boolean = false;
	let modalLoading: boolean = false;
	let formKey: string = '';
	let formValueStr: string = '{}';
	let formDescription: string = '';
	let modalError: string = '';
	let modalRequireApproval: boolean = false;

	const path: string = '/settings/system';
	const description: string = 'System Settings Management - Octobrain Admin Dashboard';
	const title: string = 'Octobrain Admin Dashboard - System Settings';
	const subtitle: string = 'System Settings';

	function getToken(): string {
		if (typeof document === 'undefined') return '';
		const cookies = document.cookie.split(';');
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.startsWith('token=')) {
				return cookie.substring('token='.length);
			}
		}
		return sessionStorage.getItem('token') || '';
	}

	function extractErrorMessage(error: any, fallbackMessage: string): string {
		if (!error) return fallbackMessage;
		const status = error?.response?.status;
		const errData = error?.response?.data;
		if (status === 401 || status === 403) {
			const msg = typeof errData?.error === 'object'
				? errData?.error?.message
				: (errData?.error || errData?.message);
			if (msg) return `Session Expired (${msg}). Please log in again.`;
			return 'Session Expired or Unauthorized (403/401). Please log in again.';
		}
		if (typeof errData?.error === 'string') return errData.error;
		if (typeof errData?.error?.message === 'string') return errData.error.message;
		if (typeof errData?.message === 'string') return errData.message;
		if (typeof error?.message === 'string') return error.message;
		return fallbackMessage;
	}

	const fetchSystemSettings = async () => {
		loading = true;
		errorMessage = '';
		try {
			const token = getToken();
			const response = await axios.get(`${apiUrl}/admin/systemSettings`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			if (response.data && Array.isArray(response.data.result)) {
				settings = response.data.result;
			} else if (response.data && Array.isArray(response.data.settings)) {
				settings = response.data.settings;
			} else {
				settings = [];
			}
		} catch (error: any) {
			if (error?.response?.status === 404 || error?.response?.data?.error === 'Not Found') {
				settings = [];
				errorMessage = '';
			} else {
				console.error('Error fetching system settings:', error);
				errorMessage = extractErrorMessage(error, 'Failed to fetch system settings');
				settings = [];
			}
		} finally {
			loading = false;
		}
	};

	function tryParseJSON(jsonString: any) {
		if (typeof jsonString === 'object' && jsonString !== null) return jsonString;
		try {
			return JSON.parse(jsonString);
		} catch {
			return jsonString;
		}
	}

	function formatValue(value: any): string {
		if (value === null || value === undefined) return 'N/A';
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	}

	function formatDate(dateStr: string | null | undefined): string {
		if (!dateStr) return 'N/A';
		try {
			return new Date(dateStr).toLocaleString();
		} catch {
			return String(dateStr);
		}
	}

	onMount(() => {
		fetchSystemSettings();
	});

	async function sendUpsertSettingRequest(payload: any) {
		const token = getToken();
		const headers = {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		};

		try {
			return await axios.patch(`${apiUrl}/admin/systemSettings`, payload, { headers });
		} catch (err: any) {
			if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK' || err?.response?.status === 405) {
				return await axios.post(`${apiUrl}/admin/systemSettings`, payload, { headers });
			}
			throw err;
		}
	}

	async function handleAuthToggleInTable(setting: any, event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = target.checked;
		errorMessage = '';
		successMessage = '';

		const currentValueObj = typeof setting.value === 'string'
			? tryParseJSON(setting.value)
			: (setting.value || {});

		const updatedValueObj = {
			...(typeof currentValueObj === 'object' && currentValueObj !== null ? currentValueObj : {}),
			requireAdminApproval: newValue
		};

		try {
			const response = await sendUpsertSettingRequest({
				key: setting.key || 'auth_settings',
				value: updatedValueObj,
				description: setting.description || 'Authentication and registration approval configuration'
			});
			successMessage = response.data?.message || 'Authentication approval setting updated successfully';
			await fetchSystemSettings();
		} catch (error: any) {
			console.error('Error updating auth settings:', error);
			if (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK') {
				errorMessage = 'CORS Error: The backend server at ' + apiUrl + ' does not allow the PATCH method in its Access-Control-Allow-Methods header.';
			} else {
				errorMessage = extractErrorMessage(error, 'Failed to update auth settings');
			}
			// Revert UI toggle on error
			target.checked = !newValue;
		}
	}

	function openCreateModal() {
		isEditMode = false;
		formKey = '';
		formValueStr = '{\n  "requireAdminApproval": true\n}';
		formDescription = '';
		modalError = '';
		modalRequireApproval = true;
		showModal = true;
	}

	function openEditModal(setting: any) {
		if (!setting) return;
		isEditMode = true;
		formKey = setting.key || '';
		formValueStr = formatValue(setting.value);
		formDescription = setting.description || '';
		modalError = '';
		modalRequireApproval = isRequireAdminApproval(setting);
		showModal = true;
	}

	function handleModalToggleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		modalRequireApproval = target.checked;
		try {
			let parsed = JSON.parse(formValueStr);
			if (typeof parsed !== 'object' || parsed === null) parsed = {};
			parsed.requireAdminApproval = target.checked;
			formValueStr = JSON.stringify(parsed, null, 2);
		} catch {
			formValueStr = JSON.stringify({ requireAdminApproval: target.checked }, null, 2);
		}
	}

	async function handleSaveSetting() {
		if (!formKey.trim()) {
			modalError = 'Setting key is required.';
			return;
		}

		let parsedValue: any;
		try {
			parsedValue = JSON.parse(formValueStr);
		} catch (e) {
			parsedValue = formValueStr;
		}

		modalLoading = true;
		modalError = '';
		errorMessage = '';
		successMessage = '';

		try {
			const response = await sendUpsertSettingRequest({
				key: formKey.trim(),
				value: parsedValue,
				description: formDescription.trim()
			});
			successMessage = response.data?.message || 'System setting updated successfully';
			showModal = false;
			await fetchSystemSettings();
		} catch (error: any) {
			console.error('Error saving system setting:', error);
			if (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK') {
				modalError = 'CORS Error: The backend server at ' + apiUrl + ' does not allow the PATCH method in its Access-Control-Allow-Methods header.';
			} else {
				modalError = extractErrorMessage(error, 'Failed to save system setting');
			}
		} finally {
			modalLoading = false;
		}
	}

	function isRequireAdminApproval(setting: any): boolean {
		if (!setting || !setting.value) return false;
		const parsed = typeof setting.value === 'string' ? tryParseJSON(setting.value) : setting.value;
		return Boolean(parsed?.requireAdminApproval);
	}
</script>

<MetaTag {path} {description} {title} {subtitle} />

<main class="relative h-full w-full overflow-y-auto bg-white dark:bg-gray-800">
	<div class="p-4">
		<Breadcrumb class="mb-5">
			<BreadcrumbItem home href="/dashboard">Home</BreadcrumbItem>
			<BreadcrumbItem href="/settings">Settings</BreadcrumbItem>
			<BreadcrumbItem>System Settings</BreadcrumbItem>
		</Breadcrumb>
		<div class="flex items-center justify-between">
			<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
				System Settings
			</Heading>
			<div class="flex items-center space-x-2">
				<Button color="alternative" size="sm" class="gap-2 px-3" on:click={fetchSystemSettings} disabled={loading}>
					<RefreshOutline size="sm" /> Refresh
				</Button>
				<Button size="sm" class="gap-2 px-3" on:click={openCreateModal}>
					<PlusOutline size="sm" /> Add Setting
				</Button>
			</div>
		</div>

		{#if successMessage}
			<Alert color="green" class="mt-4" dismissible on:close={() => (successMessage = '')}>
				<span class="font-medium">Success:</span> {successMessage}
			</Alert>
		{/if}

		{#if errorMessage}
			<Alert color="red" class="mt-4" dismissible on:close={() => (errorMessage = '')}>
				<span class="font-medium">Error:</span> {errorMessage}
			</Alert>
		{/if}
	</div>

	<!-- System Settings Table -->
	<Table>
		<TableHead class="border-y border-gray-200 bg-gray-100 dark:border-gray-700">
			{#each ['Setting Key', 'Description', 'Value (JSON)', 'Last Updated', 'Actions'] as header}
				<TableHeadCell class="p-4 font-medium">{header}</TableHeadCell>
			{/each}
		</TableHead>
		<TableBody>
			{#if loading}
				<TableBodyRow>
					<TableBodyCell colspan={5} class="p-8 text-center text-gray-500 dark:text-gray-400">
						<Spinner size="6" class="mr-2" /> Loading system settings...
					</TableBodyCell>
				</TableBodyRow>
			{:else if (settings || []).length === 0}
				<TableBodyRow>
					<TableBodyCell colspan={5} class="p-12 text-center text-gray-500 dark:text-gray-400">
						<div class="flex flex-col items-center justify-center space-y-2">
							<CogOutline class="h-10 w-10 text-gray-400 dark:text-gray-500" />
							<p class="text-base font-medium text-gray-700 dark:text-gray-300">No system settings found</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">Click "Add Setting" to create a new system setting.</p>
						</div>
					</TableBodyCell>
				</TableBodyRow>
			{:else}
				{#each settings as setting (setting?.id || setting?.key || Math.random())}
					<TableBodyRow class="text-base">
						<TableBodyCell class="p-4 font-mono text-sm font-semibold text-gray-900 dark:text-white">
							{setting?.key ?? 'N/A'}
						</TableBodyCell>
						<TableBodyCell class="p-4 text-sm text-gray-600 dark:text-gray-300">
							{setting?.description || 'No description'}
						</TableBodyCell>
						<TableBodyCell class="max-w-md p-4 text-xs text-gray-800 dark:text-gray-200">
							{#if setting?.key === 'auth_settings'}
								<div class="flex items-center space-x-3 rounded bg-gray-50 p-2 dark:bg-gray-700">
									<Toggle
										checked={isRequireAdminApproval(setting)}
										on:change={(e) => handleAuthToggleInTable(setting, e)}
									/>
									<span class="text-xs font-semibold text-gray-700 dark:text-gray-200">
										Require Admin Approval: {isRequireAdminApproval(setting) ? 'ENABLED' : 'DISABLED'}
									</span>
								</div>
							{:else}
								<pre class="max-h-24 overflow-auto rounded bg-gray-50 p-2 font-mono dark:bg-gray-900">{formatValue(setting?.value)}</pre>
							{/if}
						</TableBodyCell>
						<TableBodyCell class="p-4 text-xs">{formatDate(setting?.updatedAt || setting?.createdAt)}</TableBodyCell>
						<TableBodyCell class="p-4">
							<Button
								size="sm"
								color="alternative"
								class="gap-1 px-3"
								on:click={() => openEditModal(setting)}
							>
								<EditOutline size="sm" /> Edit
							</Button>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			{/if}
		</TableBody>
	</Table>
</main>

<!-- Create / Edit Setting Modal -->
<Modal bind:open={showModal} size="md" title={isEditMode ? 'Edit System Setting' : 'Create System Setting'} autoclose={false}>
	<form on:submit|preventDefault={handleSaveSetting} class="space-y-4 p-2">
		{#if modalError}
			<Alert color="red" class="mb-2" dismissible on:close={() => (modalError = '')}>
				{modalError}
			</Alert>
		{/if}

		<div>
			<Label for="settingKey" class="mb-2 font-medium">Setting Key *</Label>
			<Input
				id="settingKey"
				type="text"
				placeholder="e.g. auth_settings"
				bind:value={formKey}
				disabled={isEditMode}
				required
			/>
		</div>

		<div>
			<Label for="settingDescription" class="mb-2 font-medium">Description</Label>
			<Input
				id="settingDescription"
				type="text"
				placeholder="Brief summary of what this setting controls"
				bind:value={formDescription}
			/>
		</div>

		{#if formKey === 'auth_settings' || !isEditMode}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
				<div class="flex items-center justify-between">
					<span class="text-sm font-semibold text-gray-900 dark:text-white">Require Admin Approval</span>
					<Toggle
						checked={modalRequireApproval}
						on:change={handleModalToggleChange}
					/>
				</div>
			</div>
		{/if}

		<div>
			<Label for="settingValue" class="mb-2 font-medium">Value (JSON Object or String) *</Label>
			<Textarea
				id="settingValue"
				rows={6}
				placeholder={'{"requireAdminApproval": true}'}
				bind:value={formValueStr}
				class="font-mono text-xs"
				required
			/>
		</div>

		<div class="flex justify-end gap-3 pt-4">
			<Button type="button" color="alternative" on:click={() => (showModal = false)} disabled={modalLoading}>
				Cancel
			</Button>
			<Button type="submit" color="primary" disabled={modalLoading}>
				{#if modalLoading}
					<Spinner size="4" class="mr-2" /> Saving...
				{:else}
					Save Setting
				{/if}
			</Button>
		</div>
	</form>
</Modal>
