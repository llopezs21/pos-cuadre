export const fetchPaymentMethods = async () => {
	// GET /api/payment-methods
	const res = await fetch('/api/payment-methods');
	if (!res.ok) throw new Error('Error fetching payment methods');
	return res.json();
};

export const createPaymentMethod = async (payload: {
	name: string;
	code: string;
	currency?: string;
	is_active?: boolean;
	requires_responsable?: boolean;
	generates_commission?: boolean;
}) => {
	const res = await fetch('/api/payment-methods', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: 'Error' }));
		throw new Error(err.message || 'Create failed');
	}
	return res.json();
};

export const updatePaymentMethod = async (id: number | string, payload: Partial<{
	name: string;
	code: string;
	currency: string;
	is_active: boolean;
	requires_responsable: boolean;
	generates_commission: boolean;
}>) => {
	const res = await fetch(`/api/payment-methods/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: 'Error' }));
		throw new Error(err.message || 'Update failed');
	}
	return res.json();
};
