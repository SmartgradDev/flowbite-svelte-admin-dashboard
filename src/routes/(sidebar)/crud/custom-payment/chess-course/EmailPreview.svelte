<script lang="ts">
	import { Modal, Button } from 'flowbite-svelte';
	import { MailBoxSolid, EyeOutline } from 'flowbite-svelte-icons';

	export let open: boolean = false;
	export let selectedCount: number = 0;

	const LOGIN_URL = "https://octobrain.org/login";
	const REGISTER_URL = "https://octobrain.org/register";
	const COURSE_URL = "https://octobrain.org/chess-course";

	// Chess course email template
	const createChessCourseInvitationTemplate = (name: string) => {
		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Registration Verified - Chess Course Invitation</title>
				<style>
					body {
						font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
						line-height: 1.6;
						color: #333;
						max-width: 600px;
						margin: 0 auto;
						padding: 20px;
						background-color: #f8f9fa;
					}
					.container {
						background-color: #ffffff;
						padding: 40px;
						border-radius: 10px;
						box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
					}
					.header {
						text-align: center;
						margin-bottom: 30px;
					}
					.logo {
						color: #4CAF50;
						font-size: 28px;
						font-weight: bold;
						margin-bottom: 10px;
					}
					.title {
						color: #2c3e50;
						font-size: 24px;
						margin-bottom: 20px;
					}
					.message {
						font-size: 16px;
						margin-bottom: 30px;
						color: #555;
					}
					.steps-container {
						background-color: #f8f9fa;
						padding: 25px;
						border-radius: 8px;
						margin: 30px 0;
						border-left: 4px solid #4CAF50;
					}
					.step {
						margin-bottom: 20px;
						padding: 15px;
						background-color: #ffffff;
						border-radius: 5px;
						border: 1px solid #e0e0e0;
					}
					.step-number {
						display: inline-block;
						width: 30px;
						height: 30px;
						background-color: #4CAF50;
						color: white;
						text-align: center;
						line-height: 30px;
						border-radius: 50%;
						font-weight: bold;
						margin-right: 15px;
					}
					.step-content {
						display: inline-block;
						vertical-align: top;
						width: calc(100% - 50px);
					}
					.step-title {
						font-weight: bold;
						color: #2c3e50;
						margin-bottom: 5px;
					}
					.step-description {
						color: #666;
						font-size: 14px;
					}
					.course-link {
						background-color: #e8f5e8;
						padding: 20px;
						border-radius: 8px;
						margin: 25px 0;
						text-align: center;
						border: 2px solid #4CAF50;
					}
					.course-link a {
						color: #4CAF50;
						text-decoration: none;
						font-weight: bold;
						font-size: 16px;
					}
					.course-link a:hover {
						text-decoration: underline;
					}
					.footer {
						margin-top: 40px;
						padding-top: 20px;
						border-top: 1px solid #eee;
						text-align: center;
						color: #777;
						font-size: 14px;
					}
					.highlight {
						background-color: #e8f5e8;
						padding: 20px;
						border-radius: 5px;
						margin: 20px 0;
						border-left: 4px solid #4CAF50;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<div class="logo">
							<img src="https://octobrain.org/assets/common/octopus-icon.png" alt="Octobrain Logo" style="width: 40px; height: 40px; vertical-align: middle; margin-right: 10px;">
							Octobrain
						</div>
						<h1 class="title">Registration Successfully Verified!</h1>
					</div>
					
					<div class="message">
						<p>Dear ${name || 'Student'},</p>
						
						<div class="highlight">
							<p><strong>Great news!</strong> Your registration has been successfully verified, and we're excited to invite you to join our comprehensive Chess course.</p>
						</div>
						
						<p>Our Chess course is designed to take you from beginner to advanced player with:</p>
						<ul>
							<li>Interactive chess lessons and practice sessions</li>
							<li>Expert instructor guidance</li>
							<li>Strategic thinking and problem-solving skills</li>
							<li>Tournament preparation and competitive play</li>
						</ul>
					</div>
					
					<div class="steps-container">
						<h3 style="margin-top: 0; color: #2c3e50; text-align: center;">Follow These Simple Steps to Join:</h3>
						
						<div class="step">
							<span class="step-number">1</span>
							<div class="step-content">
								<div class="step-title">If you don't have an account yet:</div>
								<div class="step-description">
									Register a new account at: <a href="${REGISTER_URL}" style="color: #4CAF50; text-decoration: none;">${REGISTER_URL}</a>
								</div>
							</div>
						</div>
						
						<div class="step">
							<span class="step-number">2</span>
							<div class="step-content">
								<div class="step-title">If you already have an account:</div>
								<div class="step-description">
									Login to your account at: <a href="${LOGIN_URL}" style="color: #4CAF50; text-decoration: none;">${LOGIN_URL}</a>
								</div>
							</div>
						</div>
						
						<div class="step">
							<span class="step-number">3</span>
							<div class="step-content">
								<div class="step-title">Access the Chess Course:</div>
								<div class="step-description">
									After logging in, visit the course page to get started with your chess journey.
								</div>
							</div>
						</div>
					</div>
					
					<div class="course-link">
						<p style="margin: 0 0 10px 0; color: #2c3e50; font-weight: bold;">♟️ Chess Course Link:</p>
						<a href="${COURSE_URL}" target="_blank">${COURSE_URL}</a>
						<p style="margin: 15px 0 0 0; color: #666; font-size: 14px; font-style: italic;">
							📋 Note: Your course enrollment will be reviewed and approved within 24 hours of joining.
						</p>
					</div>
					
					<div class="message">
						<p>If you have any questions or need assistance, please don't hesitate to reach out to our support team:</p>
						<ul style="list-style: none; padding-left: 0;">
							<li style="margin-bottom: 8px;">📧 Email: <a href="mailto:hello@octobrain.org" style="color: #4CAF50; text-decoration: none;">hello@octobrain.org</a></li>
							<li style="margin-bottom: 8px;">📞 Phone: <a href="tel:+8801400442120" style="color: #4CAF50; text-decoration: none;">+88 01400 442 120</a></li>
						</ul>
						<p>We look forward to seeing you in the course!</p>
					</div>
					
					<div class="footer">
						<p>Best regards,<br><strong>The Octobrain Team</strong></p>
						<p><em>This is an automated email. Please do not reply to this message.</em></p>
					</div>
				</div>
			</body>
			</html>
		`;
	};

	$: sampleEmailHTML = createChessCourseInvitationTemplate('[Student Name]');
</script>

<Modal bind:open size="xl" autoclose={false} class="w-full">
Modal bind:open size="xl" autoclose={false} class="w-full">
	<div class="flex flex-col space-y-6">
		<div class="flex items-center space-x-2">
			<EyeOutline class="h-6 w-6 text-blue-600" />
			<h3 class="text-xl font-medium text-gray-900 dark:text-white">
				Email Preview - Chess Course Invitation
			</h3>
		</div>
		
		<div class="bg-blue-50 border-l-4 border-blue-400 p-4 dark:bg-blue-900 dark:border-blue-600">
			<div class="flex">
				<div class="flex-shrink-0">
					<MailBoxSolid class="h-5 w-5 text-blue-400" />
				</div>
				<div class="ml-3">
					<p class="text-sm text-blue-700 dark:text-blue-200">
						<strong>Subject:</strong> Registration Verified - Join Our Chess Course! ♟️
					</p>
					<p class="text-sm text-blue-700 dark:text-blue-200 mt-1">
						<strong>Recipients:</strong> {selectedCount} selected payment{selectedCount > 1 ? 's' : ''}
					</p>
				</div>
			</div>
		</div>

		<div class="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 max-h-96 overflow-y-auto">
			<h4 class="text-lg font-medium mb-3 text-gray-900 dark:text-white">Email Content Preview:</h4>
			<div class="bg-white rounded border">
				{@html sampleEmailHTML}
			</div>
		</div>

		<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 dark:bg-yellow-900 dark:border-yellow-600">
			<div class="flex">
				<div class="ml-3">
					<p class="text-sm text-yellow-700 dark:text-yellow-200">
						<strong>Note:</strong> The actual emails will be personalized with each recipient's name. 
						Users without email addresses will be skipped automatically.
					</p>
				</div>
			</div>
		</div>

		<div class="flex justify-end space-x-3">
			<Button color="alternative" on:click={() => open = false}>
				Close Preview
			</Button>
		</div>
	</div>
</Modal>
