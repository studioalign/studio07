// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
// supabase/functions/generate-invoice-pdf/index.ts - FINAL CORRECTED VERSION

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.5.28";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// FIXED: Use Deno.serve instead of serve
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get request parameters
    const { invoiceId, paymentMethod } = await req.json();
    console.log("Generating PDF for invoice:", invoiceId, "Payment method:", paymentMethod);

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select(`
        id, 
        subtotal, 
        total, 
        due_date, 
        notes,
        discount_type,
        discount_value,
        discount_reason,
        payment_method,
        parent:parent_id(id, name, email),
        studio:studio_id(id, name, email, address, phone, currency),
        items:invoice_items(
          id, 
          description, 
          quantity, 
          unit_price, 
          subtotal, 
          total,
          student:student_id(id, name)
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice lookup error:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use payment method from parameter or fall back to invoice data
    const effectivePaymentMethod = paymentMethod || invoice.payment_method || 'stripe';
    console.log("Using payment method:", effectivePaymentMethod);

    // Get studio bank details if BACS payment
    let bankDetails = null;
    if (effectivePaymentMethod === 'bacs') {
      console.log("Fetching bank details for BACS invoice");
      
      // Try studio_bank_details table first
      const { data: bankData, error: bankError } = await supabaseClient
        .from("studio_bank_details")
        .select("*")
        .eq("studio_id", invoice.studio.id)
        .single();
      
      if (bankError) {
        console.log("No studio_bank_details found, trying studios table");
        // Fall back to studios table
        const { data: studioData, error: studioError } = await supabaseClient
          .from("studios")
          .select("bank_account_name, bank_sort_code, bank_account_number, bank_name")
          .eq("id", invoice.studio.id)
          .single();
          
        if (!studioError && studioData) {
          bankDetails = {
            account_name: studioData.bank_account_name,
            sort_code: studioData.bank_sort_code,
            account_number: studioData.bank_account_number,
            bank_name: studioData.bank_name
          };
        }
      } else {
        bankDetails = bankData;
      }
      
      console.log("Bank details found:", !!bankDetails);
    }

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: invoice.studio.currency || 'GBP'
      }).format(amount);
    };

    // Create PDF
    const doc = new jsPDF();
    
    // Add studio logo/header
    doc.setFontSize(20);
    doc.setTextColor(19, 26, 86); // brand-primary color
    doc.text(invoice.studio.name, 20, 20);
    
    // Add studio info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    let yPos = 30;
    if (invoice.studio.address) {
      doc.text(invoice.studio.address, 20, yPos);
      yPos += 5;
    }
    if (invoice.studio.phone) {
      doc.text(`Phone: ${invoice.studio.phone}`, 20, yPos);
      yPos += 5;
    }
    if (invoice.studio.email) {
      doc.text(`Email: ${invoice.studio.email}`, 20, yPos);
      yPos += 5;
    }
    
    // Add invoice details
    doc.setFontSize(16);
    doc.setTextColor(19, 26, 86);
    doc.text("INVOICE", 140, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Invoice #: ${invoiceId.substring(0, 8)}`, 140, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 35);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 140, 40);
    
    // Add payment method
    doc.text(`Payment Method: ${effectivePaymentMethod === 'bacs' ? 'Bank Transfer' : 'Card Payment'}`, 140, 45);
    
    // Add bill to section
    doc.setFontSize(12);
    doc.setTextColor(19, 26, 86);
    doc.text("Bill To:", 20, 60);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(invoice.parent.name, 20, 65);
    doc.text(invoice.parent.email, 20, 70);
    
    // Add invoice items
    const tableColumn = ["Description", "Student", "Quantity", "Unit Price", "Amount"];
    const tableRows = invoice.items.map((item) => [
      item.description,
      item.student.name,
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      formatCurrency(item.total),
    ]);
    
    autoTable(doc, {
      startY: 80,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [19, 26, 86],
        textColor: [255, 255, 255],
      },
      styles: {
        cellPadding: 3,
      },
    });
    
    // Add totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Subtotal:", 140, finalY);
    doc.text(formatCurrency(invoice.subtotal), 170, finalY, { align: "right" });
    
    let currentY = finalY;
    
    // Add discount if applicable
    if (invoice.discount_value && invoice.discount_value > 0) {
      currentY += 5;
      const discountLabel = invoice.discount_type === 'percentage' 
        ? `Discount (${invoice.discount_value}%):`
        : 'Discount:';
      
      doc.text(discountLabel, 140, currentY);
      
      const discountAmount = invoice.discount_type === 'percentage'
        ? invoice.subtotal * (invoice.discount_value / 100)
        : invoice.discount_value;
        
      doc.text(`-${formatCurrency(discountAmount)}`, 170, currentY, { align: "right" });
      
      if (invoice.discount_reason) {
        currentY += 5;
        doc.text(`Reason: ${invoice.discount_reason}`, 140, currentY);
      }
    }
    
    // Add total
    currentY += 7;
    doc.setFontSize(12);
    doc.setTextColor(19, 26, 86);
    doc.text("Total:", 140, currentY);
    doc.text(formatCurrency(invoice.total), 170, currentY, { align: "right" });
    
    // Add notes if available
    if (invoice.notes) {
      currentY += 15;
      doc.setFontSize(12);
      doc.setTextColor(19, 26, 86);
      doc.text("Notes:", 20, currentY);
      
      currentY += 5;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(invoice.notes, 20, currentY);
    }
    
    // Add payment instructions for BACS
    if (effectivePaymentMethod === 'bacs') {
      currentY += 15;
      doc.setFontSize(12);
      doc.setTextColor(19, 26, 86);
      doc.text("Payment Instructions:", 20, currentY);
      
      currentY += 7;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Please make payment via bank transfer using the following details:", 20, currentY);
      
      currentY += 8;
      if (bankDetails) {
        if (bankDetails.account_name) {
          doc.text(`Account Name: ${bankDetails.account_name}`, 20, currentY);
          currentY += 6;
        }
        if (bankDetails.account_number) {
          doc.text(`Account Number: ${bankDetails.account_number}`, 20, currentY);
          currentY += 6;
        }
        if (bankDetails.sort_code) {
          doc.text(`Sort Code: ${bankDetails.sort_code}`, 20, currentY);
          currentY += 6;
        }
        if (bankDetails.bank_name) {
          doc.text(`Bank: ${bankDetails.bank_name}`, 20, currentY);
          currentY += 6;
        }
      } else {
        doc.text("Please contact the studio for bank details.", 20, currentY);
        currentY += 6;
      }
      
      currentY += 2;
      doc.text(`Payment Reference: Invoice-${invoiceId.substring(0, 8)}`, 20, currentY);
      currentY += 6;
      doc.text(`Amount: ${formatCurrency(invoice.total)}`, 20, currentY);
    }
    
    // Add footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by StudioAlign", 20, 280);
    
    // Convert PDF to base64
    const pdfOutput = doc.output('datauristring');
    
    // Upload PDF to Supabase Storage
    const pdfFileName = `invoices/${invoiceId}.pdf`;
    const { error: uploadError } = await supabaseClient.storage
      .from('invoices')
      .upload(pdfFileName, Buffer.from(pdfOutput.split(',')[1], 'base64'), {
        contentType: 'application/pdf',
        upsert: true,
      });
      
    if (uploadError) {
      console.error("PDF upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF", details: uploadError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('invoices')
      .getPublicUrl(pdfFileName);
    
    console.log("PDF uploaded successfully:", publicUrl);
    
    // Update invoice with PDF URL
    const { error: updateError } = await supabaseClient
      .from("invoices")
      .update({ pdf_url: publicUrl })
      .eq("id", invoiceId);
      
    if (updateError) {
      console.error("Invoice update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update invoice with PDF URL", details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Invoice updated with PDF URL successfully");
    
    return new Response(
      JSON.stringify({ success: true, pdf_url: publicUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    console.error("Error details:", {
      invoiceId: invoiceId || 'unknown',
      paymentMethod: paymentMethod || 'unknown',
      error: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred",
        details: {
          invoiceId: invoiceId || 'unknown',
          paymentMethod: paymentMethod || 'unknown',
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
    );
  }
});
