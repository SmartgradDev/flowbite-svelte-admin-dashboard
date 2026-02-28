<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Checkbox,
		Heading,
		Toast
	} from 'flowbite-svelte';
	import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead } from 'flowbite-svelte';
	import { TableHeadCell, Toolbar, ToolbarButton, ToolbarGroup } from 'flowbite-svelte';
	import { CogSolid, DotsVerticalOutline, DownloadSolid } from 'flowbite-svelte-icons';
	import {
		EditOutline,
		ExclamationCircleSolid,
		PlusOutline,
		TrashBinSolid,
		CheckCircleSolid,
		CloseCircleSolid
	} from 'flowbite-svelte-icons';

	import CustomPayment from '../python-course/CustomPayment.svelte';
	import AddCustomPayment from '../python-course/AddCustomPayment.svelte';
	import Delete from '../python-course/Delete.svelte';
	import MetaTag from '../../../../utils/MetaTag.svelte';
	import { onMount } from 'svelte';
	import axios from 'axios';

	const apiUrl = process.env.VITE_API_URL;
	
	// Set payment_type to club-game for this specific route
	const payment_type = "club-game";

	function setCookie(name, value, days) {
		let expires = "";
		if (days) {
			let date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toUTCString();
		}
		document.cookie = name + "=" + (value || "") + expires + "; path=/";
	}

	function getCookie(name) {
		const cookies = document.cookie.split(';');
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.startsWith(name + '=')) {
				return cookie.substring(name.length + 1);
			}
		}
		return null;
	}

	// Define the base URL for the API
	const BASE_URL = apiUrl;

	// Define customPaymentData variable
	let customPaymentData = [];
	let selectedPayments = [];
	let selectAll = false;
	let approving = false;
	let showToast = false;
	let toastMessage = '';
	let toastType = 'success'; // 'success' or 'error'

	// Function to fetch all custom payment data
	const fetchAllCustomPaymentData = async (token) => {
		try {
			const url = `${BASE_URL}/admin/allcustomPaymentData?search_value=${payment_type}&search_by=what_are_you_purchasing`;
			console.log('url==', url);
			const response = await axios.get(url, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			// Update customPaymentData with response data
			customPaymentData = response.data.result;
			console.log('Custom Payment Data fetched successfully:', customPaymentData);
		} catch (error) {
			// Log and handle errors
			console.error('Error fetching custom payment data:', error);
			console.error('Error response:', error.response?.data);
			showToastMessage('Failed to fetch payment data', 'error');
		}
	};

	const BASE_URL_refreshtoken = apiUrl;

	// Function to get refresh token
	const getRefreshToken = async () => {
		try {
			// Retrieve token and refresh token from session storage
			const token = sessionStorage.getItem('token');
			const refreshToken = sessionStorage.getItem('refreshToken');

			// Check if both token and refresh token exist
			if (!token || !refreshToken) {
				throw new Error('Token or refresh token not found in session storage.');
			}

			// Make a POST request to the refreshToken endpoint with the token and refresh token
			const response = await axios.post(`${BASE_URL_refreshtoken}/admin/refreshToken/`, {
				token,
				refreshToken
			}, {
				headers: {
					'Content-Type': 'application/json'
				}
			});

			// Extract the new token and refresh token from the response
			const newToken = response.data.token;
			const newRefreshToken = response.data.refreshToken;

			// Update session storage with the new tokens
			sessionStorage.setItem('token', newToken);
			sessionStorage.setItem('refreshToken', newRefreshToken);

			console.log('Tokens refreshed successfully.');
			return newToken;
		} catch (error) {
			console.error('Error refreshing token:', error.message);
			throw error;
		}
	};

	// Function to start polling for token refresh
	const startPolling = () => {
		setInterval(async () => {
			try {
				const newToken = await getRefreshToken();
				await fetchAllCustomPaymentData(newToken);
			} catch (error) {
				console.error('Error during polling:', error.message);
			}
		}, 10000); // Poll every 10 seconds
	};

	// On component mount
	onMount(async () => {
		// Retrieve the token from session storage
		const token = getCookie('token');

		if (token) {
			// Fetch all custom payment data using the token
			await fetchAllCustomPaymentData(token);

			// Start polling for token refresh
			startPolling();
		} else {
			console.error('Token not found in session storage.');
		}
	});

	let openCustomPayment: boolean = false;
	let addCustomPayment: boolean = false;
	let openDelete: boolean = false;
	let current_customPayment: any = {};

	const handleEdit = (customPayment) => {
		current_customPayment = { ...customPayment };
		openCustomPayment = true;
	};

	const handleDelete = (customPayment) => {
		current_customPayment = { ...customPayment };
		openDelete = true;
	};

	const handleAdd = () => {
		current_customPayment = {
			what_are_you_purchasing: payment_type // Pre-fill with current payment type
		};
		addCustomPayment = true;
	};

	// Format date function
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	};

	// Handle select all checkbox
	const handleSelectAll = () => {
		if (selectAll) {
			selectedPayments = customPaymentData.map(payment => payment.id);
		} else {
			selectedPayments = [];
		}
	};

	// Handle individual checkbox
	const handleSelectPayment = (paymentId, checked) => {
		if (checked) {
			selectedPayments = [...selectedPayments, paymentId];
		} else {
			selectedPayments = selectedPayments.filter(id => id !== paymentId);
		}
		
		// Update selectAll state
		selectAll = selectedPayments.length === customPaymentData.length;
	};

	// Approve club game payment
	const approvePayment = async (customPaymentId) => {
		approving = true;

		try {
			const token = getCookie('token');
			const response = await axios.post(
				`${apiUrl}/admin/approveClubGamePayment`,
				{ customPaymentId },
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			showToastMessage(
				response.data.message || 'Payment approved and subscription activated successfully!',
				'success'
			);

			// Refresh the data to show updated status
			const refreshToken = getCookie('token');
			if (refreshToken) {
				await fetchAllCustomPaymentData(refreshToken);
			}

		} catch (error) {
			console.error('Error approving payment:', error);
			showToastMessage(
				error.response?.data?.error || 'Failed to approve payment. Please try again.',
				'error'
			);
		} finally {
			approving = false;
		}
	};

	// Show toast message
	const showToastMessage = (message, type) => {
		toastMessage = message;
		toastType = type;
		showToast = true;
		
		// Auto-hide toast after 5 seconds
		setTimeout(() => {
			showToast = false;
		}, 5000);
	};
</script>

<MetaTag
	title="Custom Payment - Club Game"
	description="Manage custom payments for Club Game subscriptions"
/>

<main class="relative h-full w-full overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900">
	<div class="mx-auto max-w-screen-2xl">
		<Breadcrumb class="mb-5">
			<BreadcrumbItem href="/" home>Home</BreadcrumbItem>
			<BreadcrumbItem href="/crud">CRUD</BreadcrumbItem>
			<BreadcrumbItem>Custom Payment - Club Game</BreadcrumbItem>
		</Breadcrumb>
		<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
			Custom Payment - Club Game
		</Heading>
		<p class="mb-6 text-gray-500 dark:text-gray-400">
			Manage custom payments for Club Game subscriptions
		</p>

		<div class="relative overflow-hidden bg-white shadow-md dark:bg-gray-800 sm:rounded-lg">
			<Toolbar embedded class="w-full py-4 text-left text-gray-500 dark:text-gray-400">
				<ToolbarGroup>
					<Button on:click={handleAdd} class="whitespace-nowrap">
						<PlusOutline class="mr-2 h-3.5 w-3.5" />
						Add Custom Payment
					</Button>
				</ToolbarGroup>
				<ToolbarGroup>
					<ToolbarButton>
						<DownloadSolid class="h-3.5 w-3.5" />
					</ToolbarButton>
					<ToolbarButton>
						<CogSolid class="h-3.5 w-3.5" />
					</ToolbarButton>
					<ToolbarButton>
						<DotsVerticalOutline class="h-3.5 w-3.5" />
					</ToolbarButton>
				</ToolbarGroup>
			</Toolbar>

			<Table hoverable={true}>
				<TableHead>
					<TableHeadCell>
						<Checkbox 
							bind:checked={selectAll} 
							on:change={handleSelectAll}
						/>
					</TableHeadCell>
					<TableHeadCell>Name</TableHeadCell>
					<TableHeadCell>Email</TableHeadCell>
					<TableHeadCell>Email Verified</TableHeadCell>
					<TableHeadCell>Game Level</TableHeadCell>
					<TableHeadCell>Contact Number</TableHeadCell>
					<TableHeadCell>Transaction ID</TableHeadCell>
					<TableHeadCell>Payment Option</TableHeadCell>
					<TableHeadCell>Final Amount</TableHeadCell>
					<TableHeadCell>Created At</TableHeadCell>
					<TableHeadCell>Actions</TableHeadCell>
				</TableHead>
				<TableBody>
					{#each customPaymentData as customPayment, index}
						<TableBodyRow>
							<TableBodyCell>
								<Checkbox 
									checked={selectedPayments.includes(customPayment.id)}
									on:change={(e) => handleSelectPayment(customPayment.id, e.target.checked)}
								/>
							</TableBodyCell>
							<TableBodyCell>{customPayment.name || 'N/A'}</TableBodyCell>
							<TableBodyCell>
								<div class="flex items-center">
									{customPayment.email || 'N/A'}
									{#if !customPayment.email}
										<ExclamationCircleSolid class="ml-2 h-4 w-4 text-red-500" title="No email address" />
									{/if}
								</div>
							</TableBodyCell>
							<TableBodyCell>
								<div class="flex items-center">
									{#if customPayment.emailVerified}
										<CheckCircleSolid class="h-4 w-4 text-green-500 mr-1" />
										<span class="text-green-700 dark:text-green-400">Verified</span>
									{:else}
										<CloseCircleSolid class="h-4 w-4 text-red-500 mr-1" />
										<span class="text-red-700 dark:text-red-400">Not Verified</span>
									{/if}
								</div>
							</TableBodyCell>
							<TableBodyCell>
								{#if customPayment.gameLevelName}
									<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
										{customPayment.gameLevelName}
									</span>
								{:else}
									N/A
								{/if}
							</TableBodyCell>
							<TableBodyCell>{customPayment.contact_number || 'N/A'}</TableBodyCell>
							<TableBodyCell>{customPayment.transaction_id || 'N/A'}</TableBodyCell>
							<TableBodyCell>{customPayment.payment_option || 'N/A'}</TableBodyCell>
							<TableBodyCell>
								{#if customPayment.final_amount}
									<span class="font-semibold">৳{customPayment.final_amount}</span>
									{#if customPayment.discount_amount}
										<span class="text-green-600 text-sm block">(-৳{customPayment.discount_amount})</span>
									{/if}
								{:else}
									{customPayment.amount || 'N/A'}
								{/if}
							</TableBodyCell>
							<TableBodyCell>{formatDate(customPayment.createdAt)}</TableBodyCell>
							<TableBodyCell>
								{#if !customPayment.emailVerified}
									<Button
										on:click={() => approvePayment(customPayment.id)}
										disabled={approving}
										class="mr-2 font-medium"
										color="green"
										size="sm"
									>
										<CheckCircleSolid class="h-4 w-4 mr-1" />
										{approving ? 'Approving...' : 'Approve'}
									</Button>
								{/if}
								<Button
									on:click={() => handleEdit(customPayment)}
									class="mr-2 font-medium text-primary-600 hover:underline dark:text-primary-500"
									color="none"
									size="sm"
								>
									<EditOutline class="h-4 w-4" />
								</Button>
								<Button
									on:click={() => handleDelete(customPayment)}
									class="font-medium text-red-600 hover:underline dark:text-red-500"
									color="none"
									size="sm"
								>
									<TrashBinSolid class="h-4 w-4" />
								</Button>
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	</div>
</main>

<CustomPayment bind:open={openCustomPayment} bind:data={current_customPayment} />
<AddCustomPayment bind:open={addCustomPayment} bind:data={current_customPayment} />
<Delete bind:open={openDelete} bind:data={current_customPayment} />

<!-- Toast for notifications -->
{#if showToast}
	<Toast 
		position="top-right" 
		color={toastType === 'success' ? 'green' : 'red'}
		class="mb-4"
	>
		<svelte:fragment slot="icon">
			{#if toastType === 'success'}
				<CheckCircleSolid class="w-5 h-5" />
			{:else}
				<CloseCircleSolid class="w-5 h-5" />
			{/if}
		</svelte:fragment>
		{toastMessage}
	</Toast>
{/if}
