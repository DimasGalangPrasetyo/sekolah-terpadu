<?php

namespace App\Enums;

enum InvoiceKind: string
{
    case Monthly = 'monthly';
    case OneTime = 'one_time';
}
