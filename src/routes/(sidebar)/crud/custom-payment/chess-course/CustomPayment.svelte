<script lang="ts">
	import { Button, Input, Label, Modal, Toggle } from 'flowbite-svelte';
	import axios from 'axios';
	import { onMount } from 'svelte';

	export let open: boolean = false; // modal control
	export let data: any = {};

	let token: string | null;
	const apiUrl = import.meta.env.VITE_API_URL;

	function getCookie(name: string): string | null {
		const cookies = document.cookie.split(';');
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.startsWith(name + '=')) {
				return cookie.substring(name.length + 1);
			}
		}
		return null;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		console.log("Inside submit");
		console.log(token);

		try {
			// Prepare the payload with proper type conversions
			const payload = {
				id: data.id,
				name: data.name,
				email: data.email,
				emailVerified: Boolean(data.emailVerified),
				amount: data.amount,
				what_are_you_purchasing: data.what_are_you_purchasing,
				reference: data.reference || null,
				contact_number: data.contact_number || null,
				transaction_id: data.transaction_id || null,
				payment_option: data.payment_option || null,
				school_name: data.school_name || null,
				grade: data.grade || null,
				coupon_code: data.coupon_code || null,
				discount_amount: data.discount_amount ? parseInt(data.discount_amount) : null,
				final_amount: data.final_amount ? parseInt(data.final_amount) : null
			};

			console.log("Payload to send:", payload);

			const response = await axios.patch(`${apiUrl}/admin/customPaymentUpdate`, payload, {
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});
			
			console.log("Update response:", response.data);
			open = false;
			window.location.reload();
		} catch (error: any) {
			console.error('Error updating custom payment:', error);
			if (error.response) {
				console.error('Error response:', error.response.data);
				alert(`Error: ${error.response.data.error || 'Failed to update custom payment'}`);
			} else {
				alert('Failed to update custom payment. Please try again.');
			}
		}
	}

	onMount(async () => {
		// Retrieve the token from session storage
		token = getCookie('token');
	});
</script>

<Modal bind:open size="md" autoclose={false} class="w-full">
	<form class="flex flex-col space-y-6" on:submit={handleSubmit}>
		<h3 class="mb-4 text-xl font-medium text-gray-900 dark:text-white">Edit Custom Payment</h3>
		
		<Label class="space-y-2">
			<span>Name</span>
			<Input
				type="text"
				name="name"
				bind:value={data.name}
				placeholder="Enter name"
				required
			/>
		</Label>

		<Label class="space-y-2">
			<span>Email</span>
			<Input
				type="email"
				name="email"
				bind:value={data.email}
				placeholder="Enter email"
				required
			/>
		</Label>

		<Label class="space-y-2">
			<span>Email Verified</span>
			<Toggle bind:checked={data.emailVerified} />
		</Label>

		<Label class="space-y-2">
			<span>Amount</span>
			<Input
				type="text"
				name="amount"
				bind:value={data.amount}
				placeholder="Enter amount"
				required
			/>
		</Label>

		<Label class="space-y-2">
			<span>What are you purchasing</span>
			<Input
				type="text"
				name="what_are_you_purchasing"
				bind:value={data.what_are_you_purchasing}
				placeholder="Enter what you are purchasing"
				required
			/>
		</Label>

		<Label class="space-y-2">
			<span>Reference</span>
			<Input
				type="text"
				name="reference"
				bind:value={data.reference}
				placeholder="Enter reference"
			/>
		</Label>

		<Label class="space-y-2">
			<span>Contact Number</span>
			<Input
				type="text"
				name="contact_number"
				bind:value={data.contact_number}
				placeholder="Enter contact number"
			/>
		</Label>

		<Label class="space-y-2">
			<span>Transaction ID</span>
			<Input
				type="text"
				name="transaction_id"
				bind:value={data.transaction_id}
				placeholder="Enter transaction ID"
			/>
		</Label>

		<Label class="space-y-2">
			<span>Payment Option</span>
			<Input
				type="text"
				name="payment_option"
				bind:value={data.payment_option}
				placeholder="Enter payment option"
			/>
		</Label>

		<Label class="space-y-2">
			<span>School Name</span>
			<Input
				type="text"
				name="school_name"
				bind:value={data.school_name}
				placeholder="Enter school name"
			/>
		</Label>

		<Label class="space-y-2">
			<span>Grade</span>
			<Input
				type="text"
				name="grade"
				bind:value={data.grade}
				placeholder="Enter grade (e.g., Grade 8, Class 10)"
			/>
		</Label>

		<Label class="space-y-2">
			<span>Coupon Code</span>
			<Input
				type="text"
				name="coupon_code"
				bind:value={data.coupon_code}
				placeholder="Enter coupon code (optional)"
			/>
		</Label>

		<Label class="space-y-2">
			<span>Discount Amount</span>
			<Input
				type="number"
				name="discount_amount"
				bind:value={data.discount_amount}
				placeholder="Enter discount amount (optional)"
			/>
		</Label>

		<Label class="space-y-2">
			<span>Final Amount</span>
			<Input
				type="number"
				name="final_amount"
				bind:value={data.final_amount}
				placeholder="Enter final amount"
			/>
		</Label>

		<Button type="submit" class="w-full">Update Custom Payment</Button>
	</form>
</Modal>
